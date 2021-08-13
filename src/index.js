'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p'), {
  error: debug('libp2p:err')
})
const { EventEmitter } = require('events')

const errCode = require('err-code')
const PeerId = require('peer-id')
const { Multiaddr } = require('multiaddr')

const PeerRouting = require('./peer-routing')
const ContentRouting = require('./content-routing')
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
const IdentifyService = require('./identify')
const NatManager = require('./nat-manager')
const { updateSelfPeerRecord } = require('./record/utils')

/**
 * @typedef {import('libp2p-interfaces/src/connection').Connection} Connection
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxedStream} MuxedStream
 * @typedef {import('libp2p-interfaces/src/transport/types').TransportFactory<any, any>} TransportFactory
 * @typedef {import('libp2p-interfaces/src/stream-muxer/types').MuxerFactory} MuxerFactory
 * @typedef {import('libp2p-interfaces/src/content-routing/types').ContentRouting} ContentRoutingModule
 * @typedef {import('libp2p-interfaces/src/peer-discovery/types').PeerDiscoveryFactory} PeerDiscoveryFactory
 * @typedef {import('libp2p-interfaces/src/peer-routing/types').PeerRouting} PeerRoutingModule
 * @typedef {import('libp2p-interfaces/src/crypto/types').Crypto} Crypto
 * @typedef {import('libp2p-interfaces/src/pubsub')} Pubsub
 * @typedef {import('libp2p-interfaces/src/pubsub').PubsubOptions} PubsubOptions
 * @typedef {import('interface-datastore').Datastore} Datastore
 * @typedef {import('./pnet')} Protector
 */

/**
 * @typedef {Object} HandlerProps
 * @property {Connection} connection
 * @property {MuxedStream} stream
 * @property {string} protocol
 *
 * @typedef {Object} RandomWalkOptions
 * @property {boolean} [enabled = false]
 * @property {number} [queriesPerPeriod = 1]
 * @property {number} [interval = 300e3]
 * @property {number} [timeout = 10e3]
 *
 * @typedef {Object} DhtOptions
 * @property {boolean} [enabled = false]
 * @property {number} [kBucketSize = 20]
 * @property {RandomWalkOptions} [randomWalk]
 * @property {boolean} [clientMode]
 * @property {import('libp2p-interfaces/src/types').DhtSelectors} [selectors]
 * @property {import('libp2p-interfaces/src/types').DhtValidators} [validators]
 *
 * @typedef {Object} KeychainOptions
 * @property {Datastore} [datastore]
 *
 * @typedef {Object} PeerStoreOptions
 * @property {boolean} persistence
 *
 * @typedef {Object} PubsubLocalOptions
 * @property {boolean} enabled
 *
 * @typedef {Object} MetricsOptions
 * @property {boolean} enabled
 *
 * @typedef {Object} RelayOptions
 * @property {boolean} [enabled = true]
 * @property {import('./circuit').RelayAdvertiseOptions} [advertise]
 * @property {import('./circuit').HopOptions} [hop]
 * @property {import('./circuit').AutoRelayOptions} [autoRelay]
 *
 * @typedef {Object} Libp2pConfig
 * @property {DhtOptions} [dht] dht module options
 * @property {import('./nat-manager').NatManagerOptions} [nat]
 * @property {Record<string, Object|boolean>} [peerDiscovery]
 * @property {PubsubLocalOptions & PubsubOptions} [pubsub] pubsub module options
 * @property {RelayOptions} [relay]
 * @property {Record<string, Object>} [transport] transport options indexed by transport key
 *
 * @typedef {Object} Libp2pModules
 * @property {TransportFactory[]} transport
 * @property {MuxerFactory[]} streamMuxer
 * @property {Crypto[]} connEncryption
 * @property {PeerDiscoveryFactory[]} [peerDiscovery]
 * @property {PeerRoutingModule[]} [peerRouting]
 * @property {ContentRoutingModule[]} [contentRouting]
 * @property {Object} [dht]
 * @property {{new(...args: any[]): Pubsub}} [pubsub]
 * @property {Protector} [connProtector]
 *
 * @typedef {Object} Libp2pOptions
 * @property {Libp2pModules} modules libp2p modules to use
 * @property {import('./address-manager').AddressManagerOptions} [addresses]
 * @property {import('./connection-manager').ConnectionManagerOptions} [connectionManager]
 * @property {Datastore} [datastore]
 * @property {import('./dialer').DialerOptions} [dialer]
 * @property {import('./identify/index').HostProperties} [host] libp2p host
 * @property {KeychainOptions & import('./keychain/index').KeychainOptions} [keychain]
 * @property {MetricsOptions & import('./metrics').MetricsOptions} [metrics]
 * @property {import('./peer-routing').PeerRoutingOptions} [peerRouting]
 * @property {PeerStoreOptions & import('./peer-store/persistent').PersistentPeerStoreOptions} [peerStore]
 * @property {import('./transport-manager').TransportManagerOptions} [transportManager]
 * @property {Libp2pConfig} [config]
 *
 * @typedef {Object} constructorOptions
 * @property {PeerId} peerId
 *
 * @typedef {Object} CreateOptions
 * @property {PeerId} [peerId]
 *
 * @extends {EventEmitter}
 * @fires Libp2p#error Emitted when an error occurs
 * @fires Libp2p#peer:discovery Emitted when a peer is discovered
 */
class Libp2p extends EventEmitter {
  /**
   * Like `new Libp2p(options)` except it will create a `PeerId`
   * instance if one is not provided in options.
   *
   * @param {Libp2pOptions & CreateOptions} options - Libp2p configuration options
   * @returns {Promise<Libp2p>}
   */
  static async create (options) {
    if (options.peerId) {
      // @ts-ignore 'Libp2pOptions & CreateOptions' is not assignable to 'Libp2pOptions & constructorOptions'
      return new Libp2p(options)
    }

    const peerId = await PeerId.create()

    options.peerId = peerId
    // @ts-ignore 'Libp2pOptions & CreateOptions' is not assignable to 'Libp2pOptions & constructorOptions'
    return new Libp2p(options)
  }

  /**
   * Libp2p node.
   *
   * @class
   * @param {Libp2pOptions & constructorOptions} _options
   */
  constructor (_options) {
    super()
    // validateConfig will ensure the config is correct,
    // and add default values where appropriate
    this._options = validateConfig(_options)

    /** @type {PeerId} */
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
    this.addressManager = new AddressManager(this.peerId, this._options.addresses)

    // when addresses change, update our peer record
    this.addressManager.on('change:addresses', () => {
      updateSelfPeerRecord(this).catch(err => {
        log.error('Error updating self peer record', err)
      })
    })

    this._modules = this._options.modules
    this._config = this._options.config
    this._transport = [] // Transport instances/references
    this._discovery = new Map() // Discovery service instances/references

    // Create the Connection Manager
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

    // Create the Nat Manager
    this.natManager = new NatManager({
      peerId: this.peerId,
      addressManager: this.addressManager,
      transportManager: this.transportManager,
      // @ts-ignore Nat typedef is not understood as Object
      ...this._options.config.nat
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
      ...this._options.dialer
    })

    this._modules.transport.forEach((Transport) => {
      const key = Transport.prototype[Symbol.toStringTag]
      const transportOptions = this._config.transport[key]
      this.transportManager.add(key, Transport, transportOptions)
    })

    if (this._config.relay.enabled) {
      // @ts-ignore Circuit prototype
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
      this.handle(Object.values(IdentifyService.getProtocolStr(this)), this.identifyService.handleMessage)
    }

    // Attach private network protector
    if (this._modules.connProtector) {
      this.upgrader.protector = this._modules.connProtector
    } else if (globalThis.process !== undefined && globalThis.process.env && globalThis.process.env.LIBP2P_FORCE_PNET) { // eslint-disable-line no-undef
      throw new Error('Private network is enforced, but no protector was provided')
    }

    // dht provided components (peerRouting, contentRouting, dht)
    if (this._modules.dht) {
      const DHT = this._modules.dht
      // @ts-ignore Object is not constructable
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
      /** @type {Pubsub} */
      this.pubsub = PubsubAdapter(Pubsub, this, this._config.pubsub)
    }

    // Attach remaining APIs
    // peer and content routing will automatically get modules from _modules and _dht
    this.peerRouting = new PeerRouting(this)
    this.contentRouting = new ContentRouting(this)

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
   * @returns {boolean}
   */
  emit (eventName, ...args) {
    // TODO: do we still need this?
    // @ts-ignore _events does not exist in libp2p
    if (eventName === 'error' && !this._events.error) {
      log.error(args)
      return false
    } else {
      return super.emit(eventName, ...args)
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
   * @returns {Promise<void>}
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

      await this.natManager.stop()
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
   * @returns {Promise<void>}
   */
  async loadKeychain () {
    if (!this.keychain) {
      return
    }

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
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<Connection>}
   */
  dial (peer, options) {
    return this._dial(peer, options)
  }

  /**
   * Dials to the provided peer and tries to handshake with the given protocols in order.
   * If successful, the known metadata of the peer will be added to the nodes `peerStore`,
   * and the `MuxedStream` will be returned together with the successful negotiated protocol.
   *
   * @async
   * @param {PeerId|Multiaddr|string} peer - The peer to dial
   * @param {string[]|string} protocols
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   */
  async dialProtocol (peer, protocols, options) {
    if (!protocols || !protocols.length) {
      throw errCode(new Error('no protocols were provided to open a stream'), codes.ERR_INVALID_PROTOCOLS_FOR_STREAM)
    }

    const connection = await this._dial(peer, options)
    return connection.newStream(protocols)
  }

  /**
   * @async
   * @param {PeerId|Multiaddr|string} peer - The peer to dial
   * @param {object} [options]
   * @returns {Promise<Connection>}
   */
  async _dial (peer, options) {
    const { id, multiaddrs } = getPeer(peer)

    if (id.equals(this.peerId)) {
      throw errCode(new Error('Cannot dial self'), codes.ERR_DIALED_SELF)
    }

    let connection = this.connectionManager.get(id)

    if (!connection) {
      connection = await this.dialer.connectToPeer(peer, options)
    } else if (multiaddrs) {
      this.peerStore.addressBook.add(id, multiaddrs)
    }

    return connection
  }

  /**
   * Get a deduplicated list of peer advertising multiaddrs by concatenating
   * the listen addresses used by transports with any configured
   * announce addresses as well as observed addresses reported by peers.
   *
   * If Announce addrs are specified, configured listen addresses will be
   * ignored though observed addresses will still be included.
   *
   * @returns {Multiaddr[]}
   */
  get multiaddrs () {
    let addrs = this.addressManager.getAnnounceAddrs().map(ma => ma.toString())

    if (!addrs.length) {
      // no configured announce addrs, add configured listen addresses
      addrs = this.transportManager.getAddrs().map(ma => ma.toString())
    }

    addrs = addrs.concat(this.addressManager.getObservedAddrs().map(ma => ma.toString()))

    const announceFilter = this._options.addresses.announceFilter

    // dedupe multiaddrs
    const addrSet = new Set(addrs)

    // Create advertising list
    return announceFilter(Array.from(addrSet).map(str => new Multiaddr(str)))
  }

  /**
   * Disconnects all connections to the given `peer`
   *
   * @param {PeerId|Multiaddr|string} peer - the peer to close connections to
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
   * @param {(props: HandlerProps) => void} handler
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

    // Manage your NATs
    this.natManager.start()

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
   * @param {{ id: PeerId, multiaddrs: Multiaddr[], protocols: string[] }} peer
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
          log.error(`could not connect to discovered peer ${peerId.toB58String()} with ${err}`)
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
    /**
     * @param {PeerDiscoveryFactory} DiscoveryService
     */
    const setupService = (DiscoveryService) => {
      let config = {
        enabled: true // on by default
      }

      if (DiscoveryService.tag &&
        this._config.peerDiscovery &&
        this._config.peerDiscovery[DiscoveryService.tag]) {
        // @ts-ignore PeerDiscovery not understood as an Object for spread
        config = { ...config, ...this._config.peerDiscovery[DiscoveryService.tag] }
      }

      if (config.enabled &&
        !this._discovery.has(DiscoveryService.tag)) { // not already added
        let discoveryService

        if (typeof DiscoveryService === 'function') {
          // @ts-ignore DiscoveryService has no constructor type inferred
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
      // @ts-ignore Transport interface does not include discovery
      if (Transport.discovery) {
        // @ts-ignore Transport interface does not include discovery
        setupService(Transport.discovery)
      }
    }

    await Promise.all(Array.from(this._discovery.values(), d => d.start()))
  }
}

module.exports = Libp2p
