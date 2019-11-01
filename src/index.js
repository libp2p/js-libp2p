'use strict'

const FSM = require('fsm-event')
const EventEmitter = require('events').EventEmitter
const debug = require('debug')
const log = debug('libp2p')
log.error = debug('libp2p:error')
const errCode = require('err-code')
const promisify = require('promisify-es6')

const each = require('async/each')
const nextTick = require('async/nextTick')

const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')
const Switch = require('./switch')
const Ping = require('./ping')

const { emitFirst } = require('./util')
const peerRouting = require('./peer-routing')
const contentRouting = require('./content-routing')
const dht = require('./dht')
const pubsub = require('./pubsub')
const { getPeerInfo, getPeerInfoRemote } = require('./get-peer-info')
const { validate: validateConfig } = require('./config')
const { codes } = require('./errors')

const Dialer = require('./dialer')
const TransportManager = require('./transport-manager')
const Upgrader = require('./upgrader')
const PeerStore = require('./peer-store')
const Registrar = require('./registrar')

const notStarted = (action, state) => {
  return errCode(
    new Error(`libp2p cannot ${action} when not started; state is ${state}`),
    codes.ERR_NODE_NOT_STARTED
  )
}

/**
 * @fires Libp2p#error Emitted when an error occurs
 * @fires Libp2p#peer:connect Emitted when a peer is connected to this node
 * @fires Libp2p#peer:disconnect Emitted when a peer disconnects from this node
 * @fires Libp2p#peer:discovery Emitted when a peer is discovered
 * @fires Libp2p#start Emitted when the node and its services has started
 * @fires Libp2p#stop Emitted when the node and its services has stopped
 */
class Libp2p extends EventEmitter {
  constructor (_options) {
    super()
    // validateConfig will ensure the config is correct,
    // and add default values where appropriate
    this._options = validateConfig(_options)

    this.datastore = this._options.datastore
    this.peerInfo = this._options.peerInfo
    this.peerStore = new PeerStore()

    this._modules = this._options.modules
    this._config = this._options.config
    this._transport = [] // Transport instances/references
    this._discovery = [] // Discovery service instances/references

    // create the switch, and listen for errors
    this._switch = new Switch(this.peerInfo, this.peerStore, this._options.switch)

    // Setup the Upgrader
    this.upgrader = new Upgrader({
      localPeer: this.peerInfo.id,
      onConnection: (connection) => {
        const peerInfo = getPeerInfo(connection.remotePeer)

        this.peerStore.put(peerInfo)
        this.registrar.onConnect(peerInfo, connection)
        this.emit('peer:connect', peerInfo)
      },
      onConnectionEnd: (connection) => {
        const peerInfo = getPeerInfo(connection.remotePeer)

        this.registrar.onDisconnect(peerInfo, connection)
        this.emit('peer:disconnect', peerInfo)
      }
    })

    // Setup the transport manager
    this.transportManager = new TransportManager({
      libp2p: this,
      upgrader: this.upgrader
    })
    this._modules.transport.forEach((Transport) => {
      this.transportManager.add(Transport.prototype[Symbol.toStringTag], Transport)
    })

    // Attach crypto channels
    if (this._modules.connEncryption) {
      const cryptos = this._modules.connEncryption
      cryptos.forEach((crypto) => {
        this.upgrader.cryptos.set(crypto.protocol, crypto)
      })
    }

    // Attach stream multiplexers
    if (this._modules.streamMuxer) {
      const muxers = this._modules.streamMuxer
      muxers.forEach((muxer) => {
        this.upgrader.muxers.set(muxer.multicodec, muxer)
      })
    }

    this.dialer = new Dialer({
      transportManager: this.transportManager
    })

    this.registrar = new Registrar({ peerStore: this.peerStore })
    this.handle = this.handle.bind(this)
    this.registrar.handle = this.handle

    // Attach private network protector
    if (this._modules.connProtector) {
      this.upgrader.protector = this._modules.connProtector
    } else if (process.env.LIBP2P_FORCE_PNET) {
      throw new Error('Private network is enforced, but no protector was provided')
    }

    // dht provided components (peerRouting, contentRouting, dht)
    if (this._config.dht.enabled) {
      const DHT = this._modules.dht

      this._dht = new DHT(this._switch, {
        datastore: this.datastore,
        ...this._config.dht
      })
    }

    // start pubsub
    if (this._modules.pubsub && this._config.pubsub.enabled !== false) {
      this.pubsub = pubsub(this, this._modules.pubsub, this._config.pubsub)
    }

    // Attach remaining APIs
    // peer and content routing will automatically get modules from _modules and _dht
    this.peerRouting = peerRouting(this)
    this.contentRouting = contentRouting(this)
    this.dht = dht(this)

    // Mount default protocols
    Ping.mount(this._switch)

    this.state = new FSM('STOPPED', {
      STOPPED: {
        start: 'STARTING',
        stop: 'STOPPED',
        done: 'STOPPED'
      },
      STARTING: {
        done: 'STARTED',
        abort: 'STOPPED',
        stop: 'STOPPING'
      },
      STARTED: {
        stop: 'STOPPING',
        start: 'STARTED'
      },
      STOPPING: {
        stop: 'STOPPING',
        done: 'STOPPED'
      }
    })
    this.state.on('STARTING', () => {
      log('libp2p is starting')
      this._onStarting()
    })
    this.state.on('STOPPING', () => {
      log('libp2p is stopping')
    })
    this.state.on('STARTED', () => {
      log('libp2p has started')
      this.emit('start')
    })
    this.state.on('STOPPED', () => {
      log('libp2p has stopped')
      this.emit('stop')
    })
    this.state.on('error', (err) => {
      log.error(err)
      this.emit('error', err)
    })

    // Once we start, emit and dial any peers we may have already discovered
    this.state.on('STARTED', () => {
      for (const peerInfo of this.peerStore.peers) {
        this.emit('peer:discovery', peerInfo)
        this._maybeConnect(peerInfo)
      }
    })

    this._peerDiscovered = this._peerDiscovered.bind(this)

    // promisify all instance methods
    ;['start', 'hangUp', 'ping'].forEach(method => {
      this[method] = promisify(this[method], { context: this })
    })
  }

  /**
   * Overrides EventEmitter.emit to conditionally emit errors
   * if there is a handler. If not, errors will be logged.
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
   * Starts the libp2p node and all sub services
   *
   * @param {function(Error)} callback
   * @returns {void}
   */
  start (callback = () => {}) {
    emitFirst(this, ['error', 'start'], callback)
    this.state('start')
  }

  /**
   * Stop the libp2p node by closing its listeners and open connections
   * @async
   * @returns {void}
   */
  async stop () {
    this.state('stop')

    try {
      await this.transportManager.close()
      await this._switch.stop()
    } catch (err) {
      if (err) {
        log.error(err)
        this.emit('error', err)
      }
    }
    this.state('done')
  }

  isStarted () {
    return this.state ? this.state._state === 'STARTED' : false
  }

  /**
   * Dials to the provided peer. If successful, the `PeerInfo` of the
   * peer will be added to the nodes `peerStore`
   *
   * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
   * @param {object} options
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<Connection>}
   */
  dial (peer, options) {
    return this.dialProtocol(peer, null, options)
  }

  /**
   * Dials to the provided peer and handshakes with the given protocol.
   * If successful, the `PeerInfo` of the peer will be added to the nodes `peerStore`,
   * and the `Connection` will be sent in the callback
   *
   * @async
   * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
   * @param {string[]|string} protocols
   * @param {object} options
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<Connection|*>}
   */
  async dialProtocol (peer, protocols, options) {
    let connection
    if (multiaddr.isMultiaddr(peer)) {
      connection = await this.dialer.connectToMultiaddr(peer, options)
    } else {
      peer = await getPeerInfoRemote(peer, this)
      connection = await this.dialer.connectToPeer(peer, options)
    }

    const peerInfo = getPeerInfo(connection.remotePeer)

    // If a protocol was provided, create a new stream
    if (protocols) {
      const stream = await connection.newStream(protocols)

      peerInfo.protocols.add(stream.protocol)
      this.peerStore.put(peerInfo)

      return stream
    }

    this.peerStore.put(peerInfo)
    return connection
  }

  /**
   * Disconnects from the given peer
   *
   * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to ping
   * @param {function(Error)} callback
   * @returns {void}
   */
  hangUp (peer, callback) {
    getPeerInfoRemote(peer, this)
      .then(peerInfo => {
        this._switch.hangUp(peerInfo, callback)
      }, callback)
  }

  /**
   * Pings the provided peer
   *
   * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to ping
   * @param {function(Error, Ping)} callback
   * @returns {void}
   */
  ping (peer, callback) {
    if (!this.isStarted()) {
      return callback(notStarted('ping', this.state._state))
    }

    getPeerInfoRemote(peer, this)
      .then(peerInfo => {
        callback(null, new Ping(this._switch, peerInfo))
      }, callback)
  }

  /**
   * Registers the `handler` for each protocol
   * @param {string[]|string} protocols
   * @param {function({ connection:*, stream:*, protocol:string })} handler
   */
  handle (protocols, handler) {
    protocols = Array.isArray(protocols) ? protocols : [protocols]
    protocols.forEach(protocol => {
      this.upgrader.protocols.set(protocol, handler)
    })
  }

  /**
   * Removes the handler for each protocol. The protocol
   * will no longer be supported on streams.
   * @param {string[]|string} protocols
   */
  unhandle (protocols) {
    protocols = Array.isArray(protocols) ? protocols : [protocols]
    protocols.forEach(protocol => {
      this.upgrader.protocols.delete(protocol)
    })
  }

  async _onStarting () {
    if (!this._modules.transport) {
      this.emit('error', new Error('no transports were present'))
      return this.state('abort')
    }

    const multiaddrs = this.peerInfo.multiaddrs.toArray()

    // Start parallel tasks
    try {
      await Promise.all([
        this.transportManager.listen(multiaddrs)
      ])
    } catch (err) {
      log.error(err)
      this.emit('error', err)
      return this.state('stop')
    }

    // libp2p has started
    this.state('done')
  }

  /**
   * Handles discovered peers. Each discovered peer will be emitted via
   * the `peer:discovery` event. If auto dial is enabled for libp2p
   * and the current connection count is under the low watermark, the
   * peer will be dialed.
   * @private
   * @param {PeerInfo} peerInfo
   */
  _peerDiscovered (peerInfo) {
    if (peerInfo.id.toB58String() === this.peerInfo.id.toB58String()) {
      log.error(new Error(codes.ERR_DISCOVERED_SELF))
      return
    }
    peerInfo = this.peerStore.put(peerInfo)

    if (!this.isStarted()) return

    this.emit('peer:discovery', peerInfo)
    this._maybeConnect(peerInfo)
  }

  /**
   * Will dial to the given `peerInfo` if the current number of
   * connected peers is less than the configured `ConnectionManager`
   * minPeers.
   * @private
   * @param {PeerInfo} peerInfo
   */
  _maybeConnect (peerInfo) {
    // If auto dialing is on, check if we should dial
    if (this._config.peerDiscovery.autoDial === true && !peerInfo.isConnected()) {
      const minPeers = this._options.connectionManager.minPeers || 0
      if (minPeers > Object.keys(this._switch.connection.connections).length) {
        log('connecting to discovered peer')
        this._switch.dialer.connect(peerInfo, (err) => {
          err && log.error('could not connect to discovered peer', err)
        })
      }
    }
  }

  /**
   * Initializes and starts peer discovery services
   *
   * @private
   * @param {function(Error)} callback
   */
  _setupPeerDiscovery (callback) {
    for (const DiscoveryService of this._modules.peerDiscovery) {
      let config = {
        enabled: true // on by default
      }

      if (DiscoveryService.tag &&
        this._config.peerDiscovery &&
        this._config.peerDiscovery[DiscoveryService.tag]) {
        config = { ...config, ...this._config.peerDiscovery[DiscoveryService.tag] }
      }

      if (config.enabled) {
        let discoveryService

        if (typeof DiscoveryService === 'function') {
          discoveryService = new DiscoveryService(Object.assign({}, config, { peerInfo: this.peerInfo }))
        } else {
          discoveryService = DiscoveryService
        }

        discoveryService.on('peer', this._peerDiscovered)
        this._discovery.push(discoveryService)
      }
    }

    each(this._discovery, (d, cb) => {
      d.start(cb)
    }, callback)
  }
}

module.exports = Libp2p
/**
 * Like `new Libp2p(options)` except it will create a `PeerInfo`
 * instance if one is not provided in options.
 * @param {object} options Libp2p configuration options
 * @param {function(Error, Libp2p)} callback
 * @returns {void}
 */
module.exports.createLibp2p = promisify((options, callback) => {
  if (options.peerInfo) {
    return nextTick(callback, null, new Libp2p(options))
  }
  PeerInfo.create((err, peerInfo) => {
    if (err) return callback(err)
    options.peerInfo = peerInfo
    callback(null, new Libp2p(options))
  })
})
