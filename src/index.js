'use strict'

const EventEmitter = require('events').EventEmitter
const assert = require('assert')

const setImmediate = require('async/setImmediate')
const each = require('async/each')
const series = require('async/series')

const Ping = require('libp2p-ping')
const Swarm = require('libp2p-swarm')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const PeerBook = require('peer-book')
const mafmt = require('mafmt')
const multiaddr = require('multiaddr')

exports = module.exports

const OFFLINE_ERROR_MESSAGE = 'The libp2p node is not started yet'

class Node extends EventEmitter {
  constructor (_modules, _peerInfo, _peerBook, _options) {
    super()
    assert(_modules, 'requires modules to equip libp2p with features')
    assert(_peerInfo, 'requires a PeerInfo instance')

    this.modules = _modules
    this.peerInfo = _peerInfo
    this.peerBook = _peerBook || new PeerBook()
    this.isOnline = false

    this.swarm = new Swarm(this.peerInfo, this.peerBook)

    // Attach stream multiplexers
    if (this.modules.connection.muxer) {
      let muxers = this.modules.connection.muxer
      muxers = Array.isArray(muxers) ? muxers : [muxers]
      muxers.forEach((muxer) => this.swarm.connection.addStreamMuxer(muxer))

      // If muxer exists, we can use Identify
      this.swarm.connection.reuse()

      // Received incommind dial and muxer upgrade happened,
      // reuse this muxed connection
      this.swarm.on('peer-mux-established', (peerInfo) => {
        this.emit('peer:connect', peerInfo)
        this.peerBook.put(peerInfo)
      })

      this.swarm.on('peer-mux-closed', (peerInfo) => {
        this.emit('peer:disconnect', peerInfo)
      })
    }

    // Attach crypto channels
    if (this.modules.connection.crypto) {
      let cryptos = this.modules.connection.crypto
      cryptos = Array.isArray(cryptos) ? cryptos : [cryptos]
      cryptos.forEach((crypto) => {
        this.swarm.connection.crypto(crypto.tag, crypto.encrypt)
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

    // Mount default protocols
    Ping.mount(this.swarm)

    // dht provided components (peerRouting, contentRouting, dht)
    if (_modules.DHT) {
      this._dht = new this.modules.DHT(this, 20, _options.DHT && _options.DHT.datastore)
    }

    this.peerRouting = {
      findPeer: (id, callback) => {
        if (!this._dht) {
          return callback(new Error('DHT is not available'))
        }

        this._dht.findPeer(id, callback)
      }
    }

    this.contentRouting = {
      findProviders: (key, timeout, callback) => {
        if (!this._dht) {
          return callback(new Error('DHT is not available'))
        }

        this._dht.findProviders(key, timeout, callback)
      },
      provide: (key, callback) => {
        if (!this._dht) {
          return callback(new Error('DHT is not available'))
        }

        this._dht.provide(key, callback)
      }
    }

    this.dht = {
      put: (key, value, callback) => {
        if (!this._dht) {
          return callback(new Error('DHT is not available'))
        }

        this._dht.put(key, value, callback)
      },
      get: (key, callback) => {
        if (!this._dht) {
          return callback(new Error('DHT is not available'))
        }

        this._dht.get(key, callback)
      },
      getMany (key, nVals, callback) {
        if (!this._dht) {
          return callback(new Error('DHT is not available'))
        }

        this._dht.getMany(key, nVals, callback)
      }
    }
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
    this.peerInfo.multiaddrs.forEach((ma) => {
      if (!mafmt.IPFS.matches(ma)) {
        maOld.push(ma)
        maNew.push(ma.encapsulate('/ipfs/' + this.peerInfo.id.toB58String()))
      }
    })
    this.peerInfo.multiaddrs.replace(maOld, maNew)

    const multiaddrs = this.peerInfo.multiaddrs.toArray()

    transports.forEach((transport) => {
      if (transport.filter(multiaddrs).length > 0) {
        this.swarm.transport.add(
          transport.tag || transport.constructor.name, transport)
      } else if (transport.constructor &&
                 transport.constructor.name === 'WebSockets') {
        // TODO find a cleaner way to signal that a transport is always
        // used for dialing, even if no listener
        ws = transport
      }
    })

    series([
      (cb) => this.swarm.listen(cb),
      (cb) => {
        // listeners on, libp2p is on
        this.isOnline = true

        if (ws) {
          // always add dialing on websockets
          this.swarm.transport.add(ws.tag || ws.constructor.name, ws)
        }

        // all transports need to be setup before discover starts
        if (this.modules.discovery) {
          return each(this.modules.discovery, (d, cb) => d.start(cb), cb)
        }
        cb()
      },
      (cb) => {
        if (this._dht) {
          return this._dht.start(cb)
        }
        cb()
      }
    ], callback)
  }

  /*
   * Stop the libp2p node by closing its listeners and open connections
   */
  stop (callback) {
    this.isOnline = false

    if (this.modules.discovery) {
      this.modules.discovery.forEach((discovery) => {
        setImmediate(() => discovery.stop(() => {}))
      })
    }

    series([
      (cb) => {
        if (this._dht) {
          return this._dht.stop(cb)
        }
        cb()
      },
      (cb) => this.swarm.close(cb)
    ], callback)
  }

  isOn () {
    return this.isOnline
  }

  ping (peer, callback) {
    assert(this.isOn(), OFFLINE_ERROR_MESSAGE)
    this._getPeerInfo(peer, (err, peerInfo) => {
      if (err) {
        return callback(err)
      }

      callback(null, new Ping(this.swarm, peerInfo))
    })
  }

  dial (peer, protocol, callback) {
    assert(this.isOn(), OFFLINE_ERROR_MESSAGE)

    if (typeof protocol === 'function') {
      callback = protocol
      protocol = undefined
    }

    this._getPeerInfo(peer, (err, peerInfo) => {
      if (err) {
        return callback(err)
      }

      this.swarm.dial(peerInfo, protocol, (err, conn) => {
        if (err) {
          return callback(err)
        }
        this.peerBook.put(peerInfo)
        callback(null, conn)
      })
    })
  }

  hangUp (peer, callback) {
    assert(this.isOn(), OFFLINE_ERROR_MESSAGE)

    this._getPeerInfo(peer, (err, peerInfo) => {
      if (err) {
        return callback(err)
      }

      this.swarm.hangUp(peerInfo, callback)
    })
  }

  handle (protocol, handlerFunc, matchFunc) {
    this.swarm.handle(protocol, handlerFunc, matchFunc)
  }

  unhandle (protocol) {
    this.swarm.unhandle(protocol)
  }

  /*
   * Helper method to check the data type of peer and convert it to PeerInfo
   */
  _getPeerInfo (peer, callback) {
    let p
    // PeerInfo
    if (PeerInfo.isPeerInfo(peer)) {
      p = peer
    // Multiaddr instance (not string)
    } else if (multiaddr.isMultiaddr(peer)) {
      const peerIdB58Str = peer.getPeerId()
      try {
        p = this.peerBook.get(peerIdB58Str)
      } catch (err) {
        p = new PeerInfo(PeerId.createFromB58String(peerIdB58Str))
      }
      p.multiaddrs.add(peer)
    // PeerId
    } else if (PeerId.isPeerId(peer)) {
      const peerIdB58Str = peer.toB58String()
      try {
        p = this.peerBook.get(peerIdB58Str)
      } catch (err) {
        return this.peerRouting.findPeer(peer, callback)
      }
    } else {
      return setImmediate(() => callback(new Error('peer type not recognized')))
    }

    setImmediate(() => callback(null, p))
  }
}

module.exports = Node
