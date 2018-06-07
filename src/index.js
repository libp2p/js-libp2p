'use strict'

const EventEmitter = require('events').EventEmitter
const assert = require('assert')

const each = require('async/each')
const series = require('async/series')
const parallel = require('async/parallel')

const PeerBook = require('peer-book')
const Switch = require('libp2p-switch')
const Ping = require('libp2p-ping')
const WebSockets = require('libp2p-websockets')
const ConnectionManager = require('libp2p-connection-manager')

const peerRouting = require('./peer-routing')
const contentRouting = require('./content-routing')
const dht = require('./dht')
const pubsub = require('./pubsub')
const getPeerInfo = require('./get-peer-info')
const validateConfig = require('./config').validate

exports = module.exports

const NOT_STARTED_ERROR_MESSAGE = 'The libp2p node is not started yet'

class Node extends EventEmitter {
  constructor (_options) {
    super()
    // validateConfig will ensure the config is correct,
    // and add default values where appropriate
    _options = validateConfig(_options)

    this.peerInfo = _options.peerInfo
    this.peerBook = _options.peerBook || new PeerBook()

    this._modules = _options.modules
    this._config = _options.config
    this._isStarted = false
    this._transport = [] // Transport instances/references
    this._discovery = [] // Discovery service instances/references

    this._switch = new Switch(this.peerInfo, this.peerBook, _options.switch)
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
        this.peerBook.put(peerInfo)
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
    if (this._config.EXPERIMENTAL.dht) {
      const DHT = this._modules.dht
      this._dht = new DHT(this._switch, {
        kBucketSize: this._config.dht.kBucketSize || 20,
        // TODO make datastore an option of libp2p itself so
        // that other things can use it as well
        datastore: dht.datastore
      })
    }

    // enable/disable pubsub
    if (this._config.EXPERIMENTAL.pubsub) {
      this.pubsub = pubsub(this)
    }

    // Attach remaining APIs
    this.peerRouting = peerRouting(this)
    this.contentRouting = contentRouting(this)
    this.dht = dht(this)

    this._getPeerInfo = getPeerInfo(this)

    // Mount default protocols
    Ping.mount(this._switch)
  }

  /*
   * Start the libp2p node
   *   - create listeners on the multiaddrs the Peer wants to listen
   */
  start (callback) {
    if (!this._modules.transport) {
      return callback(new Error('no transports were present'))
    }

    let ws

    // so that we can have webrtc-star addrs without adding manually the id
    const maOld = []
    const maNew = []
    this.peerInfo.multiaddrs.toArray().forEach((ma) => {
      if (!ma.getPeerId()) {
        maOld.push(ma)
        maNew.push(ma.encapsulate('/ipfs/' + this.peerInfo.id.toB58String()))
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
        this._switch.transport.add(t.tag || t.constructor.name, t)
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
        // TODO: chicken-and-egg problem #1:
        // have to set started here because DHT requires libp2p is already started
        this._isStarted = true
        if (this._dht) {
          this._dht.start(cb)
        } else {
          cb()
        }
      },
      (cb) => {
        // TODO: chicken-and-egg problem #2:
        // have to set started here because FloodSub requires libp2p is already started
        if (this._floodSub) {
          this._floodSub.start(cb)
        } else {
          cb()
        }
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
      },
      (cb) => {
        this.emit('start')
        cb()
      }
    ], callback)
  }

  /*
   * Stop the libp2p node by closing its listeners and open connections
   */
  stop (callback) {
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
        this.emit('stop')
        cb()
      }
    ], (err) => {
      this._isStarted = false
      callback(err)
    })
  }

  isStarted () {
    return this._isStarted
  }

  dial (peer, callback) {
    assert(this.isStarted(), NOT_STARTED_ERROR_MESSAGE)

    this._getPeerInfo(peer, (err, peerInfo) => {
      if (err) { return callback(err) }

      this._switch.dial(peerInfo, (err) => {
        if (err) { return callback(err) }

        this.peerBook.put(peerInfo)
        callback()
      })
    })
  }

  dialProtocol (peer, protocol, callback) {
    assert(this.isStarted(), NOT_STARTED_ERROR_MESSAGE)

    if (typeof protocol === 'function') {
      callback = protocol
      protocol = undefined
    }

    this._getPeerInfo(peer, (err, peerInfo) => {
      if (err) { return callback(err) }

      this._switch.dial(peerInfo, protocol, (err, conn) => {
        if (err) { return callback(err) }
        this.peerBook.put(peerInfo)
        callback(null, conn)
      })
    })
  }

  hangUp (peer, callback) {
    assert(this.isStarted(), NOT_STARTED_ERROR_MESSAGE)

    this._getPeerInfo(peer, (err, peerInfo) => {
      if (err) { return callback(err) }

      this._switch.hangUp(peerInfo, callback)
    })
  }

  ping (peer, callback) {
    if (!this.isStarted()) {
      return callback(new Error(NOT_STARTED_ERROR_MESSAGE))
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
}

module.exports = Node
