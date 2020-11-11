'use strict'

const { EventEmitter } = require('events')
const debug = require('debug')
const globalThis = require('ipfs-utils/src/globalthis')
const log = debug('libp2p')
log.error = debug('libp2p:error')

const errCode = require('err-code')
const PeerId = require('peer-id')

const PeerRouting = require('./peer-routing')
const contentRouting = require('./content-routing')
const getPeer = require('./get-peer')
const { validate: validateConfig } = require('./config')
const { codes, messages } = require('./errors')

const AddressManager = require('./address-manager')
const ConnectionManager = require('./connection-manager')
const Circuit = require('./circuit/transport')
const Relay = require('./circuit')
const Dialer = require('./dialer')
const Keychain = require('./keychain')
const Metrics = require('./metrics')
const TransportManager = require('./transport-manager')
const Upgrader = require('./upgrader')
const PeerStore = require('./peer-store')
const PubsubAdapter = require('./pubsub-adapter')
const PersistentPeerStore = require('./peer-store/persistent')
const Registrar = require('./registrar')
const ping = require('./ping')
const {
  IdentifyService,
  multicodecs: IDENTIFY_PROTOCOLS
} = require('./identify')

/**
 * @fires Libp2p#error Emitted when an error occurs
 * @fires Libp2p#peer:discovery Emitted when a peer is discovered
 */
class Libp2p extends EventEmitter {
  constructor (_options) {
    super()
    // validateConfig will ensure the config is correct,
    // and add default values where appropriate
    this._options = validateConfig(_options)

    this.peerId = this._options.peerId
    this.datastore = this._options.datastore

    this.peerStore = (this.datastore && this._options.peerStore.persistence)
      ? new PersistentPeerStore({
        peerId: this.peerId,
        datastore: this.datastore,
        ...this._options.peerStore
      })
      : new PeerStore({ peerId: this.peerId })

    // Addresses {listen, announce, noAnnounce}
    this.addresses = this._options.addresses
    this.addressManager = new AddressManager(this._options.addresses)

    this._modules = this._options.modules
    this._config = this._options.config
    this._transport = [] // Transport instances/references
    this._discovery = new Map() // Discovery service instances/references

    // Create the Connection Manager
    if (this._options.connectionManager.minPeers) { // Remove in 0.29
      this._options.connectionManager.minConnections = this._options.connectionManager.minPeers
    }
    this.connectionManager = new ConnectionManager(this, {
      autoDial: this._config.peerDiscovery.autoDial,
      ...this._options.connectionManager
    })

    // Create Metrics
    if (this._options.metrics.enabled) {
      this.metrics = new Metrics({
        ...this._options.metrics,
        connectionManager: this.connectionManager
      })
    }

    // Create keychain
    if (this._options.keychain && this._options.keychain.datastore) {
      log('creating keychain')

      const keychainOpts = Keychain.generateOptions()

      this.keychain = new Keychain(this._options.keychain.datastore, {
        passPhrase: this._options.keychain.pass,
        ...keychainOpts,
        ...this._options.keychain
      })

      log('keychain constructed')
    }

    // Setup the Upgrader
    this.upgrader = new Upgrader({
      localPeer: this.peerId,
      metrics: this.metrics,
      onConnection: (connection) => this.connectionManager.onConnect(connection),
      onConnectionEnd: (connection) => this.connectionManager.onDisconnect(connection)
    })

    // Setup the transport manager
    this.transportManager = new TransportManager({
      libp2p: this,
      upgrader: this.upgrader,
      faultTolerance: this._options.transportManager.faultTolerance
    })

    // Create the Registrar
    this.registrar = new Registrar({
      peerStore: this.peerStore,
      connectionManager: this.connectionManager
    })

    this.handle = this.handle.bind(this)
    this.registrar.handle = this.handle

    // Attach crypto channels
    if (!this._modules.connEncryption || !this._modules.connEncryption.length) {
      throw errCode(new Error(messages.CONN_ENCRYPTION_REQUIRED), codes.CONN_ENCRYPTION_REQUIRED)
    }
    const cryptos = this._modules.connEncryption
    cryptos.forEach((crypto) => {
      this.upgrader.cryptos.set(crypto.protocol, crypto)
    })

    this.dialer = new Dialer({
      transportManager: this.transportManager,
      peerStore: this.peerStore,
      concurrency: this._options.dialer.maxParallelDials,
      perPeerLimit: this._options.dialer.maxDialsPerPeer,
      timeout: this._options.dialer.dialTimeout,
      resolvers: this._options.dialer.resolvers
    })

    this._modules.transport.forEach((Transport) => {
      const key = Transport.prototype[Symbol.toStringTag]
      const transportOptions = this._config.transport[key]
      this.transportManager.add(key, Transport, transportOptions)
    })

    if (this._config.relay.enabled) {
      this.transportManager.add(Circuit.prototype[Symbol.toStringTag], Circuit)
      this.relay = new Relay(this)
    }

    // Attach stream multiplexers
    if (this._modules.streamMuxer) {
      const muxers = this._modules.streamMuxer
      muxers.forEach((muxer) => {
        this.upgrader.muxers.set(muxer.multicodec, muxer)
      })

      // Add the identify service since we can multiplex
      this.identifyService = new IdentifyService({ libp2p: this })
      this.handle(Object.values(IDENTIFY_PROTOCOLS), this.identifyService.handleMessage)
    }

    // Attach private network protector
    if (this._modules.connProtector) {
      this.upgrader.protector = this._modules.connProtector
    } else if (globalThis.process !== undefined && globalThis.process.env && globalThis.process.env.LIBP2P_FORCE_PNET) {
      throw new Error('Private network is enforced, but no protector was provided')
    }

    // dht provided components (peerRouting, contentRouting, dht)
    if (this._modules.dht) {
      const DHT = this._modules.dht
      this._dht = new DHT({
        libp2p: this,
        dialer: this.dialer,
        peerId: this.peerId,
        peerStore: this.peerStore,
        registrar: this.registrar,
        datastore: this.datastore,
        ...this._config.dht
      })
    }

    // Create pubsub if provided
    if (this._modules.pubsub) {
      const Pubsub = this._modules.pubsub
      // using pubsub adapter with *DEPRECATED* handlers functionality
      this.pubsub = PubsubAdapter(Pubsub, this, this._config.pubsub)
    }

    // Attach remaining APIs
    // peer and content routing will automatically get modules from _modules and _dht
    this.peerRouting = new PeerRouting(this)
    this.contentRouting = contentRouting(this)

    // Mount default protocols
    ping.mount(this)

    this._onDiscoveryPeer = this._onDiscoveryPeer.bind(this)
  }

  /**
   * Overrides EventEmitter.emit to conditionally emit errors
   * if there is a handler. If not, errors will be logged.
   *
   * @param {string} eventName
   * @param  {...any} args
   * @returns {void}
   */
  emit (eventName, ...args) {
    if (eventName === 'error' && !this._events.error) {
      log.error(...args)
    } else {
      super.emit(eventName, ...args)
    }
  }

  /**
   * Starts the libp2p node and all its subsystems
   *
   * @returns {Promise<void>}
   */
  async start () {
    log('libp2p is starting')

    try {
      await this._onStarting()
      await this._onDidStart()
      log('libp2p has started')
    } catch (err) {
      this.emit('error', err)
      log.error('An error occurred starting libp2p', err)
      await this.stop()
      throw err
    }
  }

  /**
   * Stop the libp2p node by closing its listeners and open connections
   *
   * @async
   * @returns {void}
   */
  async stop () {
    log('libp2p is stopping')

    try {
      this._isStarted = false

      this.relay && this.relay.stop()
      this.peerRouting.stop()

      for (const service of this._discovery.values()) {
        service.removeListener('peer', this._onDiscoveryPeer)
      }

      await Promise.all(Array.from(this._discovery.values(), s => s.stop()))

      this._discovery = new Map()

      await this.peerStore.stop()
      await this.connectionManager.stop()

      await Promise.all([
        this.pubsub && this.pubsub.stop(),
        this._dht && this._dht.stop(),
        this.metrics && this.metrics.stop()
      ])

      await this.transportManager.close()

      ping.unmount(this)
      this.dialer.destroy()
    } catch (err) {
      if (err) {
        log.error(err)
        this.emit('error', err)
      }
    }
    log('libp2p has stopped')
  }

  /**
   * Load keychain keys from the datastore.
   * Imports the private key as 'self', if needed.
   *
   * @async
   * @returns {void}
   */
  async loadKeychain () {
    try {
      await this.keychain.findKeyByName('self')
    } catch (err) {
      await this.keychain.importPeer('self', this.peerId)
    }
  }

  isStarted () {
    return this._isStarted
  }

  /**
   * Gets a Map of the current connections. The keys are the stringified
   * `PeerId` of the peer. The value is an array of Connections to that peer.
   *
   * @returns {Map<string, Connection[]>}
   */
  get connections () {
    return this.connectionManager.connections
  }

  /**
   * Dials to the provided peer. If successful, the known metadata of the
   * peer will be added to the nodes `peerStore`
   *
   * @param {PeerId|Multiaddr|string} peer - The peer to dial
   * @param {object} options
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<Connection>}
   */
  dial (peer, options) {
    return this.dialProtocol(peer, null, options)
  }

  /**
   * Dials to the provided peer and handshakes with the given protocol.
   * If successful, the known metadata of the peer will be added to the nodes `peerStore`,
   * and the `Connection` will be returned
   *
   * @async
   * @param {PeerId|Multiaddr|string} peer - The peer to dial
   * @param {string[]|string} protocols
   * @param {object} options
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<Connection|*>}
   */
  async dialProtocol (peer, protocols, options) {
    const { id, multiaddrs } = getPeer(peer)
    let connection = this.connectionManager.get(id)

    if (!connection) {
      connection = await this.dialer.connectToPeer(peer, options)
    } else if (multiaddrs) {
      this.peerStore.addressBook.add(id, multiaddrs)
    }

    // If a protocol was provided, create a new stream
    if (protocols) {
      return connection.newStream(protocols)
    }

    return connection
  }

  /**
   * Get peer advertising multiaddrs by concating the addresses used
   * by transports to listen with the announce addresses.
   * Duplicated addresses and noAnnounce addresses are filtered out.
   *
   * @returns {Array<Multiaddr>}
   */
  get multiaddrs () {
    const announceAddrs = this.addressManager.getAnnounceAddrs()
    if (announceAddrs.length) {
      return announceAddrs
    }

    const announceFilter = this._options.addresses.announceFilter || ((multiaddrs) => multiaddrs)

    // Create advertising list
    return announceFilter(this.transportManager.getAddrs())
  }

  /**
   * Disconnects all connections to the given `peer`
   *
   * @param {PeerId|multiaddr|string} peer - the peer to close connections to
   * @returns {Promise<void>}
   */
  async hangUp (peer) {
    const { id } = getPeer(peer)

    const connections = this.connectionManager.connections.get(id.toB58String())

    if (!connections) {
      return
    }

    await Promise.all(
      connections.map(connection => {
        return connection.close()
      })
    )
  }

  /**
   * Pings the given peer in order to obtain the operation latency.
   *
   * @param {PeerId|Multiaddr|string} peer - The peer to ping
   * @returns {Promise<number>}
   */
  ping (peer) {
    const { id, multiaddrs } = getPeer(peer)

    // If received multiaddr, ping it
    if (multiaddrs) {
      return ping(this, multiaddrs[0])
    }

    return ping(this, id)
  }

  /**
   * Registers the `handler` for each protocol
   *
   * @param {string[]|string} protocols
   * @param {function({ connection:*, stream:*, protocol:string })} handler
   */
  handle (protocols, handler) {
    protocols = Array.isArray(protocols) ? protocols : [protocols]
    protocols.forEach(protocol => {
      this.upgrader.protocols.set(protocol, handler)
    })

    // Add new protocols to self protocols in the Protobook
    this.peerStore.protoBook.add(this.peerId, protocols)
  }

  /**
   * Removes the handler for each protocol. The protocol
   * will no longer be supported on streams.
   *
   * @param {string[]|string} protocols
   */
  unhandle (protocols) {
    protocols = Array.isArray(protocols) ? protocols : [protocols]
    protocols.forEach(protocol => {
      this.upgrader.protocols.delete(protocol)
    })

    // Remove protocols from self protocols in the Protobook
    this.peerStore.protoBook.remove(this.peerId, protocols)
  }

  async _onStarting () {
    // Listen on the provided transports for the provided addresses
    const addrs = this.addressManager.getListenAddrs()
    await this.transportManager.listen(addrs)

    // Start PeerStore
    await this.peerStore.start()

    if (this._config.pubsub.enabled) {
      this.pubsub && this.pubsub.start()
    }

    // DHT subsystem
    if (this._config.dht.enabled) {
      this._dht && this._dht.start()

      // TODO: this should be modified once random-walk is used as
      // the other discovery modules
      this._dht.on('peer', this._onDiscoveryPeer)
    }

    // Start metrics if present
    this.metrics && this.metrics.start()
  }

  /**
   * Called when libp2p has started and before it returns
   *
   * @private
   */
  async _onDidStart () {
    this._isStarted = true

    this.peerStore.on('peer', peerId => {
      this.emit('peer:discovery', peerId)
      this._maybeConnect(peerId)
    })

    // Once we start, emit any peers we may have already discovered
    // TODO: this should be removed, as we already discovered these peers in the past
    for (const peer of this.peerStore.peers.values()) {
      this.emit('peer:discovery', peer.id)
    }

    this.connectionManager.start()

    // Peer discovery
    await this._setupPeerDiscovery()

    // Relay
    this.relay && this.relay.start()

    this.peerRouting.start()
  }

  /**
   * Called whenever peer discovery services emit `peer` events.
   * Known peers may be emitted.
   *
   * @private
   * @param {{ id: PeerId, multiaddrs: Array<Multiaddr>, protocols: Array<string> }} peer
   */
  _onDiscoveryPeer (peer) {
    if (peer.id.toB58String() === this.peerId.toB58String()) {
      log.error(new Error(codes.ERR_DISCOVERED_SELF))
      return
    }

    peer.multiaddrs && this.peerStore.addressBook.add(peer.id, peer.multiaddrs)
    peer.protocols && this.peerStore.protoBook.set(peer.id, peer.protocols)
  }

  /**
   * Will dial to the given `peerId` if the current number of
   * connected peers is less than the configured `ConnectionManager`
   * minConnections.
   *
   * @private
   * @param {PeerId} peerId
   */
  async _maybeConnect (peerId) {
    // If auto dialing is on and we have no connection to the peer, check if we should dial
    if (this._config.peerDiscovery.autoDial === true && !this.connectionManager.get(peerId)) {
      const minConnections = this._options.connectionManager.minConnections || 0
      if (minConnections > this.connectionManager.size) {
        log('connecting to discovered peer %s', peerId.toB58String())
        try {
          await this.dialer.connectToPeer(peerId)
        } catch (err) {
          log.error('could not connect to discovered peer', err)
        }
      }
    }
  }

  /**
   * Initializes and starts peer discovery services
   *
   * @async
   * @private
   */
  async _setupPeerDiscovery () {
    const setupService = (DiscoveryService) => {
      let config = {
        enabled: true // on by default
      }

      if (DiscoveryService.tag &&
        this._config.peerDiscovery &&
        this._config.peerDiscovery[DiscoveryService.tag]) {
        config = { ...config, ...this._config.peerDiscovery[DiscoveryService.tag] }
      }

      if (config.enabled &&
        !this._discovery.has(DiscoveryService.tag)) { // not already added
        let discoveryService

        if (typeof DiscoveryService === 'function') {
          discoveryService = new DiscoveryService(Object.assign({}, config, {
            peerId: this.peerId,
            libp2p: this
          }))
        } else {
          discoveryService = DiscoveryService
        }

        discoveryService.on('peer', this._onDiscoveryPeer)
        this._discovery.set(DiscoveryService.tag, discoveryService)
      }
    }

    // Discovery modules
    for (const DiscoveryService of this._modules.peerDiscovery || []) {
      setupService(DiscoveryService)
    }

    // Transport modules with discovery
    for (const Transport of this.transportManager.getTransports()) {
      if (Transport.discovery) {
        setupService(Transport.discovery)
      }
    }

    await Promise.all(Array.from(this._discovery.values(), d => d.start()))
  }
}

/**
 * Like `new Libp2p(options)` except it will create a `PeerId`
 * instance if one is not provided in options.
 *
 * @param {object} options - Libp2p configuration options
 * @returns {Libp2p}
 */
Libp2p.create = async function create (options = {}) {
  if (options.peerId) {
    return new Libp2p(options)
  }

  const peerId = await PeerId.create()

  options.peerId = peerId
  return new Libp2p(options)
}

module.exports = Libp2p
