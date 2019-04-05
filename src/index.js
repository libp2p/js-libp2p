'use strict'

const FSM = require('fsm-event')
const EventEmitter = require('events').EventEmitter
const debug = require('debug')
const log = debug('libp2p')
log.error = debug('libp2p:error')
const errCode = require('err-code')

const each = require('async/each')
const series = require('async/series')
const parallel = require('async/parallel')

const PeerBook = require('peer-book')
const Switch = require('libp2p-switch')
const Ping = require('libp2p-ping')
const WebSockets = require('libp2p-websockets')
const ConnectionManager = require('libp2p-connection-manager')

const { emitFirst } = require('./util')
const peerRouting = require('./peer-routing')
const contentRouting = require('./content-routing')
const dht = require('./dht')
const pubsub = require('./pubsub')
const getPeerInfo = require('./get-peer-info')
const validateConfig = require('./config').validate

const notStarted = (action, state) => {
  return errCode(
    new Error(`libp2p cannot ${action} when not started; state is ${state}`),
    'ERR_NODE_NOT_STARTED'
  )
}

/**
 * @fires Node#error Emitted when an error occurs
 * @fires Node#peer:connect Emitted when a peer is connected to this node
 * @fires Node#peer:disconnect Emitted when a peer disconnects from this node
 * @fires Node#peer:discovery Emitted when a peer is discovered
 * @fires Node#start Emitted when the node and its services has started
 * @fires Node#stop Emitted when the node and its services has stopped
 */
class Node extends EventEmitter {
  constructor (_options) {
    super()
    // validateConfig will ensure the config is correct,
    // and add default values where appropriate
    _options = validateConfig(_options)

    this.datastore = _options.datastore
    this.peerInfo = _options.peerInfo
    this.peerBook = _options.peerBook || new PeerBook()

    this._modules = _options.modules
    this._config = _options.config
    this._transport = [] // Transport instances/references
    this._discovery = [] // Discovery service instances/references

    // create the switch, and listen for errors
    this._switch = new Switch(this.peerInfo, this.peerBook, _options.switch)
    this._switch.on('error', (...args) => this.emit('error', ...args))

    this.stats = this._switch.stats
    this.connectionManager = new ConnectionManager(this, _options.connectionManager)

    // Attach stream multiplexers
    if (this._modules.streamMuxer) {
      let muxers = this._modules.streamMuxer
      muxers.forEach((muxer) => this._switch.connection.addStreamMuxer(muxer))

      // If muxer exists
      //   we can use Identify
      this._switch.connection.reuse()
      //   we can use Relay for listening/dialing
      this._switch.connection.enableCircuitRelay(this._config.relay)

      // Received incomming dial and muxer upgrade happened,
      // reuse this muxed connection
      this._switch.on('peer-mux-established', (peerInfo) => {
        this.emit('peer:connect', peerInfo)
      })

      this._switch.on('peer-mux-closed', (peerInfo) => {
        this.emit('peer:disconnect', peerInfo)
      })
    }

    // Attach crypto channels
    if (this._modules.connEncryption) {
      let cryptos = this._modules.connEncryption
      cryptos.forEach((crypto) => {
        this._switch.connection.crypto(crypto.tag, crypto.encrypt)
      })
    }

    // Attach private network protector
    if (this._modules.connProtector) {
      this._switch.protector = this._modules.connProtector
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

    // enable/disable pubsub
    if (this._config.EXPERIMENTAL.pubsub) {
      this.pubsub = pubsub(this)
    }

    // Attach remaining APIs
    // peer and content routing will automatically get modules from _modules and _dht
    this.peerRouting = peerRouting(this)
    this.contentRouting = contentRouting(this)
    this.dht = dht(this)

    this._getPeerInfo = getPeerInfo(this)

    // Mount default protocols
    Ping.mount(this._switch)

    this.state = new FSM('STOPPED', {
      STOPPED: {
        start: 'STARTING',
        stop: 'STOPPED'
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
      this._onStopping()
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
   *
   * @param {function(Error)} callback
   * @returns {void}
   */
  stop (callback = () => {}) {
    emitFirst(this, ['error', 'stop'], callback)
    this.state('stop')
  }

  isStarted () {
    return this.state ? this.state._state === 'STARTED' : false
  }

  /**
   * Dials to the provided peer. If successful, the `PeerInfo` of the
   * peer will be added to the nodes `PeerBook`
   *
   * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
   * @param {function(Error)} callback
   * @returns {void}
   */
  dial (peer, callback) {
    this.dialProtocol(peer, null, callback)
  }

  /**
   * Dials to the provided peer and handshakes with the given protocol.
   * If successful, the `PeerInfo` of the peer will be added to the nodes `PeerBook`,
   * and the `Connection` will be sent in the callback
   *
   * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
   * @param {string} protocol
   * @param {function(Error, Connection)} callback
   * @returns {void}
   */
  dialProtocol (peer, protocol, callback) {
    if (!this.isStarted()) {
      return callback(notStarted('dial', this.state._state))
    }

    if (typeof protocol === 'function') {
      callback = protocol
      protocol = undefined
    }

    this._getPeerInfo(peer, (err, peerInfo) => {
      if (err) { return callback(err) }

      this._switch.dial(peerInfo, protocol, callback)
    })
  }

  /**
   * Similar to `dial` and `dialProtocol`, but the callback will contain a
   * Connection State Machine.
   *
   * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
   * @param {string} protocol
   * @param {function(Error, ConnectionFSM)} callback
   * @returns {void}
   */
  dialFSM (peer, protocol, callback) {
    if (!this.isStarted()) {
      return callback(notStarted('dial', this.state._state))
    }

    if (typeof protocol === 'function') {
      callback = protocol
      protocol = undefined
    }

    this._getPeerInfo(peer, (err, peerInfo) => {
      if (err) { return callback(err) }

      this._switch.dialFSM(peerInfo, protocol, callback)
    })
  }

  hangUp (peer, callback) {
    this._getPeerInfo(peer, (err, peerInfo) => {
      if (err) { return callback(err) }

      this._switch.hangUp(peerInfo, callback)
    })
  }

  ping (peer, callback) {
    if (!this.isStarted()) {
      return callback(notStarted('ping', this.state._state))
    }

    this._getPeerInfo(peer, (err, peerInfo) => {
      if (err) { return callback(err) }

      callback(null, new Ping(this._switch, peerInfo))
    })
  }

  handle (protocol, handlerFunc, matchFunc) {
    this._switch.handle(protocol, handlerFunc, matchFunc)
  }

  unhandle (protocol) {
    this._switch.unhandle(protocol)
  }

  _onStarting () {
    if (!this._modules.transport) {
      this.emit('error', new Error('no transports were present'))
      return this.state('abort')
    }

    let ws

    // so that we can have webrtc-star addrs without adding manually the id
    const maOld = []
    const maNew = []
    this.peerInfo.multiaddrs.toArray().forEach((ma) => {
      if (!ma.getPeerId()) {
        maOld.push(ma)
        maNew.push(ma.encapsulate('/p2p/' + this.peerInfo.id.toB58String()))
      }
    })
    this.peerInfo.multiaddrs.replace(maOld, maNew)

    const multiaddrs = this.peerInfo.multiaddrs.toArray()

    this._modules.transport.forEach((Transport) => {
      let t

      if (typeof Transport === 'function') {
        t = new Transport()
      } else {
        t = Transport
      }

      if (t.filter(multiaddrs).length > 0) {
        this._switch.transport.add(t.tag || t[Symbol.toStringTag], t)
      } else if (WebSockets.isWebSockets(t)) {
        // TODO find a cleaner way to signal that a transport is always used
        // for dialing, even if no listener
        ws = t
      }
      this._transport.push(t)
    })

    series([
      (cb) => {
        this.connectionManager.start()
        this._switch.start(cb)
      },
      (cb) => {
        if (ws) {
          // always add dialing on websockets
          this._switch.transport.add(ws.tag || ws.constructor.name, ws)
        }

        // all transports need to be setup before discover starts
        if (this._modules.peerDiscovery) {
          each(this._modules.peerDiscovery, (D, _cb) => {
            let config = {}

            if (D.tag &&
              this._config.peerDiscovery &&
              this._config.peerDiscovery[D.tag]) {
              config = this._config.peerDiscovery[D.tag]
            }

            // If not configured to be enabled/disabled then enable by default
            const enabled = config.enabled == null ? true : config.enabled

            // If enabled then start it
            if (enabled) {
              let d

              if (typeof D === 'function') {
                d = new D(Object.assign({}, config, { peerInfo: this.peerInfo }))
              } else {
                d = D
              }

              d.on('peer', (peerInfo) => this.emit('peer:discovery', peerInfo))
              this._discovery.push(d)
              d.start(_cb)
            } else {
              _cb()
            }
          }, cb)
        } else {
          cb()
        }
      },
      (cb) => {
        if (this._dht) {
          this._dht.start(() => {
            this._dht.on('peer', (peerInfo) => this.emit('peer:discovery', peerInfo))
            cb()
          })
        } else {
          cb()
        }
      },
      (cb) => {
        if (this._floodSub) {
          return this._floodSub.start(cb)
        }
        cb()
      },
      (cb) => {
        // detect which multiaddrs we don't have a transport for and remove them
        const multiaddrs = this.peerInfo.multiaddrs.toArray()

        multiaddrs.forEach((multiaddr) => {
          if (!multiaddr.toString().match(/\/p2p-circuit($|\/)/) &&
              !this._transport.find((transport) => transport.filter(multiaddr).length > 0)) {
            this.peerInfo.multiaddrs.delete(multiaddr)
          }
        })
        cb()
      }
    ], (err) => {
      if (err) {
        log.error(err)
        this.emit('error', err)
        return this.state('stop')
      }
      this.state('done')
    })
  }

  _onStopping () {
    series([
      (cb) => {
        if (this._modules.peerDiscovery) {
          // stop all discoveries before continuing with shutdown
          return parallel(
            this._discovery.map((d) => {
              return (_cb) => d.stop(() => { _cb() })
            }),
            cb
          )
        }
        cb()
      },
      (cb) => {
        if (this._floodSub) {
          return this._floodSub.stop(cb)
        }
        cb()
      },
      (cb) => {
        if (this._dht) {
          return this._dht.stop(cb)
        }
        cb()
      },
      (cb) => {
        this.connectionManager.stop()
        this._switch.stop(cb)
      },
      (cb) => {
        // Ensures idempotent restarts, ignore any errors
        // from removeAll, they're not useful at this point
        this._switch.transport.removeAll(() => cb())
      }
    ], (err) => {
      if (err) {
        log.error(err)
        this.emit('error', err)
      }
      this.state('done')
    })
  }
}

module.exports = Node
