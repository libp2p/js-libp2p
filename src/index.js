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
const assert = require('assert')

/**
 * A DHT implementation modeled after Kademlia with Coral and S/Kademlia modifications.
 *
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
class KadDHT {
  /**
   * Create a new KadDHT.
   *
   * @param {Swarm} swarm
   * @param {object} options // {kBucketSize=20, datastore=MemoryDatastore}
   */
  constructor (swarm, options) {
    assert(swarm, 'libp2p-kad-dht requires a instance of swarmt a')
    options = options || {}

    /**
     * Local reference to libp2p-swarm.
     *
     * @type {Swarm}
     */
    this.swarm = swarm

    /**
     * k-bucket size, defaults to 20.
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
    this.network.start(callback)
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
    this.bootstrapStop()
    this.providers.stop()
    this.network.stop(callback)
  }

  /**
   * Local peer (yourself)
   *
   * @type {PeerInfo}
   */
  get peerInfo () {
    return this.swarm._peerInfo
  }

  get peerBook () {
    return this.swarm._peerBook
  }

  /**
   * Kademlia 'node lookup' operation.
   *
   * @param {Buffer} key
   * @param {function(Error, Array<PeerId>)} callback
   * @returns {void}
   */
  getClosestPeers (key, callback) {
    this._log('getClosestPeers to %s', key.toString())
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
   * Store the given key/value  pair in the DHT.
   *
   * @param {Buffer} key
   * @param {Buffer} value
   * @param {function(Error)} callback
   * @returns {void}
   */
  put (key, value, callback) {
    this._log('PutValue %s', key)
    let sign
    try {
      sign = libp2pRecord.validator.isSigned(this.validators, key)
    } catch (err) {
      return callback(err)
    }

    waterfall([
      (cb) => utils.createPutRecord(key, value, this.peerInfo.id, sign, cb),
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
   * @param {number} [maxTimeout=60000] - optional timeout
   * @param {function(Error, Buffer)} callback
   * @returns {void}
   */
  get (key, maxTimeout, callback) {
    if (typeof maxTimeout === 'function') {
      callback = maxTimeout
      maxTimeout = null
    }

    if (maxTimeout == null) {
      maxTimeout = c.minute
    }

    this._get(key, maxTimeout, callback)
  }

  /**
   * Get the `n` values to the given key without sorting.
   *
   * @param {Buffer} key
   * @param {number} nvals
   * @param {number} [maxTimeout=60000]
   * @param {function(Error, Array<{from: PeerId, val: Buffer}>)} callback
   * @returns {void}
   */
  getMany (key, nvals, maxTimeout, callback) {
    if (typeof maxTimeout === 'function') {
      callback = maxTimeout
      maxTimeout = null
    }
    if (maxTimeout == null) {
      maxTimeout = c.minute
    }

    this._log('getMany %s (%s)', key, nvals)
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

              const res = {
                closerPeers: peers
              }

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
          timeout((cb) => {
            query.run(rtp, cb)
          }, maxTimeout)(cb)
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
   * Announce to the network that a node can provide the given key.
   * This is what Coral and MainlineDHT do to store large values
   * in a DHT.
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
   * @param {number} timeout - how long the query should maximally run, in milliseconds.
   * @param {function(Error, Array<PeerInfo>)} callback
   * @returns {void}
   */
  findProviders (key, timeout, callback) {
    this._log('findProviders %s', key.toBaseEncodedString())
    this._findNProviders(key, timeout, c.K, callback)
  }

  /**
   * Search for a peer with the given ID.
   *
   * @param {PeerId} id
   * @param {number} [maxTimeout=60000]
   * @param {function(Error, PeerInfo)} callback
   * @returns {void}
   */
  findPeer (id, maxTimeout, callback) {
    if (typeof maxTimeout === 'function') {
      callback = maxTimeout
      maxTimeout = null
    }

    if (maxTimeout == null) {
      maxTimeout = c.minute
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
          }, maxTimeout)(cb)
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

  /**
   * Start the bootstrap process. This means running a number of queries every interval requesting random data.
   * This is done to keep the dht healthy over time.
   *
   * @param {number} [queries=1] - how many queries to run per period
   * @param {number} [period=300000] - how often to run the the bootstrap process, in milliseconds (5min)
   * @param {number} [maxTimeout=10000] - how long to wait for the the bootstrap query to run, in milliseconds (10s)
   * @returns {void}
   */
  bootstrapStart (queries, period, maxTimeout) {
    if (queries == null) {
      queries = 1
    }
    if (period == null) {
      period = 5 * c.minute
    }
    if (maxTimeout == null) {
      maxTimeout = 10 * c.second
    }

    // Don't run twice
    if (this._bootstrapRunning) {
      return
    }

    this._bootstrapRunning = setInterval(
      () => this._bootstrap(queries, maxTimeout),
      period
    )
  }

  /**
   * Stop the bootstrap process.
   *
   * @returns {void}
   */
  bootstrapStop () {
    if (this._bootstrapRunning) {
      clearInterval(this._bootstrapRunning)
    }
  }
}

module.exports = KadDHT
