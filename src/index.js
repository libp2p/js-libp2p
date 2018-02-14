'use strict'

const EventEmitter = require('events').EventEmitter
const assert = require('assert')

const setImmediate = require('async/setImmediate')
const each = require('async/each')
const series = require('async/series')

const PeerBook = require('peer-book')
const Switch = require('libp2p-switch')
const Ping = require('libp2p-ping')

const peerRouting = require('./peer-routing')
const contentRouting = require('./content-routing')
const dht = require('./dht')
const pubsub = require('./pubsub')
const getPeerInfo = require('./get-peer-info')

exports = module.exports

const NOT_STARTED_ERROR_MESSAGE = 'The libp2p node is not started yet'

class Node extends EventEmitter {
  constructor (_modules, _peerInfo, _peerBook, _options) {
    super()
    assert(_modules, 'requires modules to equip libp2p with features')
    assert(_peerInfo, 'requires a PeerInfo instance')

    this.modules = _modules
    this.peerInfo = _peerInfo
    this.peerBook = _peerBook || new PeerBook()
    _options = _options || {}

    this._isStarted = false

    this.switch = new Switch(this.peerInfo, this.peerBook)

    // Attach stream multiplexers
    if (this.modules.connection && this.modules.connection.muxer) {
      let muxers = this.modules.connection.muxer
      muxers = Array.isArray(muxers) ? muxers : [muxers]
      muxers.forEach((muxer) => this.switch.connection.addStreamMuxer(muxer))

      // If muxer exists, we can use Identify
      this.switch.connection.reuse()

      // If muxer exists, we can use Relay for listening/dialing
      this.switch.connection.enableCircuitRelay(_options.relay)

      // Received incommind dial and muxer upgrade happened,
      // reuse this muxed connection
      this.switch.on('peer-mux-established', (peerInfo) => {
        this.emit('peer:connect', peerInfo)
        this.peerBook.put(peerInfo)
      })

      this.switch.on('peer-mux-closed', (peerInfo) => {
        this.emit('peer:disconnect', peerInfo)
      })
    }

    // Attach crypto channels
    if (this.modules.connection && this.modules.connection.crypto) {
      let cryptos = this.modules.connection.crypto
      cryptos = Array.isArray(cryptos) ? cryptos : [cryptos]
      cryptos.forEach((crypto) => {
        this.switch.connection.crypto(crypto.tag, crypto.encrypt)
      })
    }

    // Attach discovery mechanisms
    if (this.modules.discovery) {
      let discoveries = this.modules.discovery
      discoveries = Array.isArray(discoveries) ? discoveries : [discoveries]

      discoveries.forEach((discovery) => {
        discovery.on('peer', (peerInfo) => this.emit('peer:discovery', peerInfo))
      })
    }

    // dht provided components (peerRouting, contentRouting, dht)
    if (_modules.DHT) {
      this._dht = new this.modules.DHT(this.switch, {
        kBucketSize: 20,
        datastore: _options.DHT && _options.DHT.datastore
      })
    }

    this.peerRouting = peerRouting(this)
    this.contentRouting = contentRouting(this)
    this.dht = dht(this)
    this.pubsub = pubsub(this)

    this._getPeerInfo = getPeerInfo(this)

    // Mount default protocols
    Ping.mount(this.switch)
  }

  /*
   * Start the libp2p node
   *   - create listeners on the multiaddrs the Peer wants to listen
   */
  start (callback) {
    if (!this.modules.transport) {
      return callback(new Error('no transports were present'))
    }

    let ws
    let transports = this.modules.transport

    transports = Array.isArray(transports) ? transports : [transports]

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
    transports.forEach((transport) => {
      if (transport.filter(multiaddrs).length > 0) {
        this.switch.transport.add(
          transport.tag || transport.constructor.name, transport)
      } else if (transport.constructor &&
                 transport.constructor.name === 'WebSockets') {
        // TODO find a cleaner way to signal that a transport is always
        // used for dialing, even if no listener
        ws = transport
      }
    })

    series([
      (cb) => this.switch.start(cb),
      (cb) => {
        if (ws) {
          // always add dialing on websockets
          this.switch.transport.add(ws.tag || ws.constructor.name, ws)
        }

        // all transports need to be setup before discover starts
        if (this.modules.discovery) {
          return each(this.modules.discovery, (d, cb) => d.start(cb), cb)
        }
        cb()
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
        if (this._options !== false) {
          this._floodSub.start(cb)
        } else {
          cb()
        }
      },

      (cb) => {
        // detect which multiaddrs we don't have a transport for and remove them
        const multiaddrs = this.peerInfo.multiaddrs.toArray()

        transports.forEach((transport) => {
          multiaddrs.forEach((multiaddr) => {
            if (!multiaddr.toString().match(/\/p2p-circuit($|\/)/) &&
                !transports.find((transport) => transport.filter(multiaddr).length > 0)) {
              this.peerInfo.multiaddrs.delete(multiaddr)
            }
          })
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
    if (this.modules.discovery) {
      this.modules.discovery.forEach((discovery) => {
        setImmediate(() => discovery.stop(() => {}))
      })
    }

    series([
      (cb) => {
        if (this._floodSub.started) {
          this._floodSub.stop(cb)
        }
      },
      (cb) => {
        if (this._dht) {
          return this._dht.stop(cb)
        }
        cb()
      },
      (cb) => this.switch.stop(cb),
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

      this.switch.dial(peerInfo, (err) => {
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

      this.switch.dial(peerInfo, protocol, (err, conn) => {
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

      this.switch.hangUp(peerInfo, callback)
    })
  }

  ping (peer, callback) {
    assert(this.isStarted(), NOT_STARTED_ERROR_MESSAGE)
    this._getPeerInfo(peer, (err, peerInfo) => {
      if (err) { return callback(err) }

      callback(null, new Ping(this.switch, peerInfo))
    })
  }

  handle (protocol, handlerFunc, matchFunc) {
    this.switch.handle(protocol, handlerFunc, matchFunc)
  }

  unhandle (protocol) {
    this.switch.unhandle(protocol)
  }
}

module.exports = Node
