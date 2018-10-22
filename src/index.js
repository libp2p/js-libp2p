'use strict'

const libp2pRecord = require('libp2p-record')
const MemoryStore = require('interface-datastore').MemoryDatastore
const waterfall = require('async/waterfall')
const each = require('async/each')
const timeout = require('async/timeout')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const crypto = require('libp2p-crypto')

const RoutingTable = require('./routing')
const utils = require('./utils')
const c = require('./constants')
const Query = require('./query')
const Network = require('./network')
const errors = require('./errors')
const privateApi = require('./private')
const Providers = require('./providers')
const Message = require('./message')
const RandomWalk = require('./random-walk')
const assert = require('assert')

/**
 * A DHT implementation modeled after Kademlia with S/Kademlia modifications.
 *
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
class KadDHT {
  /**
   * Create a new KadDHT.
   *
   * @param {Switch} sw libp2p-switch instance
   * @param {object} options DHT options
   * @param {number} options.kBucketSize k-bucket size (default 20)
   * @param {Datastore} options.datastore datastore (default MemoryDatastore)
   * @param {boolean} options.enabledDiscovery enable dht discovery (default true)
   */
  constructor (sw, options) {
    assert(sw, 'libp2p-kad-dht requires a instance of Switch')
    options = options || {}

    /**
     * Local reference to the libp2p-switch instance
     *
     * @type {Switch}
     */
    this.switch = sw

    /**
     * k-bucket size, defaults to 20
     *
     * @type {number}
     */
    this.kBucketSize = options.kBucketSize || 20

    /**
     * Number of closest peers to return on kBucket search, default 6
     *
     * @type {number}
     */
    this.ncp = options.ncp || 6

    /**
     * The routing table.
     *
     * @type {RoutingTable}
     */
    this.routingTable = new RoutingTable(this.peerInfo.id, this.kBucketSize)

    /**
     * Reference to the datastore, uses an in-memory store if none given.
     *
     * @type {Datastore}
     */
    this.datastore = options.datastore || new MemoryStore()

    /**
     * Provider management
     *
     * @type {Providers}
     */
    this.providers = new Providers(this.datastore, this.peerInfo.id)

    this.validators = { pk: libp2pRecord.validator.validators.pk }
    this.selectors = { pk: libp2pRecord.selection.selectors.pk }

    this.network = new Network(this)

    this._log = utils.logger(this.peerInfo.id)

    // Inject private apis so we don't clutter up this file
    const pa = privateApi(this)
    Object.keys(pa).forEach((name) => { this[name] = pa[name] })

    /**
     * Provider management
     *
     * @type {RandomWalk}
     */
    this.randomWalk = new RandomWalk(this)

    /**
     * Random walk state, default true
     */
    this.randomWalkEnabled = !options.hasOwnProperty('enabledDiscovery') ? true : Boolean(options.enabledDiscovery)
  }

  /**
   * Is this DHT running.
   *
   * @type {bool}
   */
  get isStarted () {
    return this._running
  }

  /**
   * Start listening to incoming connections.
   *
   * @param {function(Error)} callback
   * @returns {void}
   */
  start (callback) {
    this._running = true
    this.network.start((err) => {
      if (err) {
        return callback(err)
      }

      // Start random walk if enabled
      this.randomWalkEnabled && this.randomWalk.start()
      callback()
    })
  }

  /**
   * Stop accepting incoming connections and sending outgoing
   * messages.
   *
   * @param {function(Error)} callback
   * @returns {void}
   */
  stop (callback) {
    this._running = false
    this.randomWalk.stop(() => { // guarantee that random walk is stopped if it was started
      this.providers.stop()
      this.network.stop(callback)
    })
  }

  /**
   * Local peer (yourself)
   *
   * @type {PeerInfo}
   */
  get peerInfo () {
    return this.switch._peerInfo
  }

  get peerBook () {
    return this.switch._peerBook
  }

  /**
   * Store the given key/value  pair in the DHT.
   *
   * @param {Buffer} key
   * @param {Buffer} value
   * @param {function(Error)} callback
   * @returns {void}
   */
  put (key, value, callback) {
    this._log('PutValue %b', key)

    waterfall([
      (cb) => utils.createPutRecord(key, value, cb),
      (rec, cb) => waterfall([
        (cb) => this._putLocal(key, rec, cb),
        (cb) => this.getClosestPeers(key, cb),
        (peers, cb) => each(peers, (peer, cb) => {
          this._putValueToPeer(key, rec, peer, cb)
        }, cb)
      ], cb)
    ], callback)
  }

  /**
   * Get the value to the given key.
   * Times out after 1 minute.
   *
   * @param {Buffer} key
   * @param {Object} options - get options
   * @param {number} options.maxTimeout - optional timeout (default: 60000)
   * @param {function(Error, Buffer)} callback
   * @returns {void}
   */
  get (key, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    } else if (typeof options === 'number') { // This will be deprecated in a next release
      options = {
        maxTimeout: options
      }
    } else {
      options = options || {}
    }

    if (!options.maxTimeout) {
      options.maxTimeout = c.minute
    }

    this._get(key, options, callback)
  }

  /**
   * Get the `n` values to the given key without sorting.
   *
   * @param {Buffer} key
   * @param {number} nvals
   * @param {Object} options - get options
   * @param {number} options.maxTimeout - optional timeout (default: 60000)
   * @param {function(Error, Array<{from: PeerId, val: Buffer}>)} callback
   * @returns {void}
   */
  getMany (key, nvals, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    } else if (typeof options === 'number') { // This will be deprecated in a next release
      options = {
        maxTimeout: options
      }
    } else {
      options = options || {}
    }

    if (!options.maxTimeout) {
      options.maxTimeout = c.minute
    }

    this._log('getMany %b (%s)', key, nvals)
    const vals = []

    this._getLocal(key, (err, localRec) => {
      if (err && nvals === 0) {
        return callback(err)
      }

      if (err == null) {
        vals.push({
          val: localRec.value,
          from: this.peerInfo.id
        })
      }

      if (nvals <= 1) {
        return callback(null, vals)
      }

      waterfall([
        (cb) => utils.convertBuffer(key, cb),
        (id, cb) => {
          const rtp = this.routingTable.closestPeers(id, c.ALPHA)

          this._log('peers in rt: %d', rtp.length)
          if (rtp.length === 0) {
            this._log.error('No peers from routing table!')
            return cb(new Error('Failed to lookup key'))
          }

          // we have peers, lets do the actualy query to them
          const query = new Query(this, key, (peer, cb) => {
            this._getValueOrPeers(peer, key, (err, rec, peers) => {
              if (err) {
                // If we have an invalid record we just want to continue and fetch a new one.
                if (!(err instanceof errors.InvalidRecordError)) {
                  return cb(err)
                }
              }

              const res = { closerPeers: peers }

              if ((rec && rec.value) ||
                  err instanceof errors.InvalidRecordError) {
                vals.push({
                  val: rec && rec.value,
                  from: peer
                })
              }

              // enough is enough
              if (vals.length >= nvals) {
                res.success = true
              }

              cb(null, res)
            })
          })

          // run our query
          timeout((cb) => query.run(rtp, cb), options.maxTimeout)(cb)
        }
      ], (err) => {
        if (err && vals.length === 0) {
          return callback(err)
        }

        callback(null, vals)
      })
    })
  }

  /**
   * Kademlia 'node lookup' operation.
   *
   * @param {Buffer} key
   * @param {function(Error, Array<PeerId>)} callback
   * @returns {void}
   */
  getClosestPeers (key, callback) {
    this._log('getClosestPeers to %b', key)
    utils.convertBuffer(key, (err, id) => {
      if (err) {
        return callback(err)
      }

      const tablePeers = this.routingTable.closestPeers(id, c.ALPHA)

      const q = new Query(this, key, (peer, callback) => {
        waterfall([
          (cb) => this._closerPeersSingle(key, peer, cb),
          (closer, cb) => {
            cb(null, {
              closerPeers: closer
            })
          }
        ], callback)
      })

      q.run(tablePeers, (err, res) => {
        if (err) {
          return callback(err)
        }

        if (!res || !res.finalSet) {
          return callback(null, [])
        }

        waterfall([
          (cb) => utils.sortClosestPeers(Array.from(res.finalSet), id, cb),
          (sorted, cb) => cb(null, sorted.slice(0, c.K))
        ], callback)
      })
    })
  }

  /**
   * Get the public key for the given peer id.
   *
   * @param {PeerId} peer
   * @param {function(Error, PubKey)} callback
   * @returns {void}
   */
  getPublicKey (peer, callback) {
    this._log('getPublicKey %s', peer.toB58String())
    // local check
    let info
    if (this.peerBook.has(peer)) {
      info = this.peerBook.get(peer)

      if (info && info.id.pubKey) {
        this._log('getPublicKey: found local copy')
        return callback(null, info.id.pubKey)
      }
    } else {
      info = this.peerBook.put(new PeerInfo(peer))
    }
    // try the node directly
    this._getPublicKeyFromNode(peer, (err, pk) => {
      if (!err) {
        info.id = new PeerId(peer.id, null, pk)
        this.peerBook.put(info)

        return callback(null, pk)
      }

      // dht directly
      const pkKey = utils.keyForPublicKey(peer)
      this.get(pkKey, (err, value) => {
        if (err) {
          return callback(err)
        }

        const pk = crypto.unmarshalPublicKey(value)
        info.id = new PeerId(peer, null, pk)
        this.peerBook.put(info)

        callback(null, pk)
      })
    })
  }

  /**
   * Look if we are connected to a peer with the given id.
   * Returns the `PeerInfo` for it, if found, otherwise `undefined`.
   *
   * @param {PeerId} peer
   * @param {function(Error, PeerInfo)} callback
   * @returns {void}
   */
  findPeerLocal (peer, callback) {
    this._log('findPeerLocal %s', peer.toB58String())
    this.routingTable.find(peer, (err, p) => {
      if (err) {
        return callback(err)
      }
      if (!p || !this.peerBook.has(p)) {
        return callback()
      }
      callback(null, this.peerBook.get(p))
    })
  }

  // ----------- Content Routing

  /**
   * Announce to the network that we can provide given key's value.
   *
   * @param {CID} key
   * @param {function(Error)} callback
   * @returns {void}
   */
  provide (key, callback) {
    this._log('provide: %s', key.toBaseEncodedString())

    waterfall([
      (cb) => this.providers.addProvider(key, this.peerInfo.id, cb),
      (cb) => this.getClosestPeers(key.buffer, cb),
      (peers, cb) => {
        const msg = new Message(Message.TYPES.ADD_PROVIDER, key.buffer, 0)
        msg.providerPeers = peers.map((p) => new PeerInfo(p))

        each(peers, (peer, cb) => {
          this._log('putProvider %s to %s', key.toBaseEncodedString(), peer.toB58String())
          this.network.sendMessage(peer, msg, cb)
        }, cb)
      }
    ], (err) => callback(err))
  }

  /**
   * Search the dht for up to `K` providers of the given CID.
   *
   * @param {CID} key
   * @param {Object} options - findProviders options
   * @param {number} options.maxTimeout - how long the query should maximally run, in milliseconds (default: 60000)
   * @param {function(Error, Array<PeerInfo>)} callback
   * @returns {void}
   */
  findProviders (key, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    } else if (typeof options === 'number') { // This will be deprecated in a next release
      options = {
        maxTimeout: options
      }
    } else {
      options = options || {}
    }

    if (!options.maxTimeout) {
      options.maxTimeout = c.minute
    }

    this._log('findProviders %s', key.toBaseEncodedString())
    this._findNProviders(key, options.maxTimeout, c.K, callback)
  }

  // ----------- Peer Routing

  /**
   * Search for a peer with the given ID.
   *
   * @param {PeerId} id
   * @param {Object} options - findPeer options
   * @param {number} options.maxTimeout - how long the query should maximally run, in milliseconds (default: 60000)
   * @param {function(Error, PeerInfo)} callback
   * @returns {void}
   */
  findPeer (id, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    } else if (typeof options === 'number') { // This will be deprecated in a next release
      options = {
        maxTimeout: options
      }
    } else {
      options = options || {}
    }

    if (!options.maxTimeout) {
      options.maxTimeout = c.minute
    }

    this._log('findPeer %s', id.toB58String())

    this.findPeerLocal(id, (err, pi) => {
      if (err) {
        return callback(err)
      }

      // already got it
      if (pi != null) {
        this._log('found local')
        return callback(null, pi)
      }

      waterfall([
        (cb) => utils.convertPeerId(id, cb),
        (key, cb) => {
          const peers = this.routingTable.closestPeers(key, c.ALPHA)

          if (peers.length === 0) {
            return cb(new errors.LookupFailureError())
          }

          // sanity check
          const match = peers.find((p) => p.isEqual(id))
          if (match && this.peerBook.has(id)) {
            this._log('found in peerbook')
            return cb(null, this.peerBook.get(id))
          }

          // query the network
          const query = new Query(this, id.id, (peer, cb) => {
            waterfall([
              (cb) => this._findPeerSingle(peer, id, cb),
              (msg, cb) => {
                const match = msg.closerPeers.find((p) => p.id.isEqual(id))

                // found it
                if (match) {
                  return cb(null, {
                    peer: match,
                    success: true
                  })
                }

                cb(null, {
                  closerPeers: msg.closerPeers
                })
              }
            ], cb)
          })

          timeout((cb) => {
            query.run(peers, cb)
          }, options.maxTimeout)(cb)
        },
        (result, cb) => {
          this._log('findPeer %s: %s', id.toB58String(), result.success)
          if (!result.peer) {
            return cb(new errors.NotFoundError())
          }
          cb(null, result.peer)
        }
      ], callback)
    })
  }
}

module.exports = KadDHT
