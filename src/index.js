'use strict'

const { EventEmitter } = require('events')
const libp2pRecord = require('libp2p-record')
const MemoryStore = require('interface-datastore').MemoryDatastore
const waterfall = require('async/waterfall')
const each = require('async/each')
const filter = require('async/filter')
const timeout = require('async/timeout')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const crypto = require('libp2p-crypto')
const promiseToCallback = require('promise-to-callback')

const errcode = require('err-code')

const RoutingTable = require('./routing')
const utils = require('./utils')
const c = require('./constants')
const Query = require('./query')
const Network = require('./network')
const privateApi = require('./private')
const Providers = require('./providers')
const Message = require('./message')
const RandomWalk = require('./random-walk')
const QueryManager = require('./query-manager')
const assert = require('assert')

/**
 * A DHT implementation modeled after Kademlia with S/Kademlia modifications.
 *
 * Original implementation in go: https://github.com/libp2p/go-libp2p-kad-dht.
 */
class KadDHT extends EventEmitter {
  /**
   * Random walk options
   *
   * @typedef {Object} randomWalkOptions
   * @property {boolean} enabled discovery enabled (default: true)
   * @property {number} queriesPerPeriod how many queries to run per period (default: 1)
   * @property {number} interval how often to run the the random-walk process, in milliseconds (default: 300000)
   * @property {number} timeout how long to wait for the the random-walk query to run, in milliseconds (default: 30000)
   * @property {number} delay how long to wait before starting the first random walk, in milliseconds (default: 10000)
   */

  /**
   * Create a new KadDHT.
   *
   * @param {Switch} sw libp2p-switch instance
   * @param {object} options DHT options
   * @param {number} options.kBucketSize k-bucket size (default 20)
   * @param {number} options.concurrency alpha concurrency of queries (default 3)
   * @param {Datastore} options.datastore datastore (default MemoryDatastore)
   * @param {object} options.validators validators object with namespace as keys and function(key, record, callback)
   * @param {object} options.selectors selectors object with namespace as keys and function(key, records)
   * @param {randomWalkOptions} options.randomWalk randomWalk options
   */
  constructor (sw, options) {
    super()
    assert(sw, 'libp2p-kad-dht requires a instance of Switch')
    options = options || {}
    options.validators = options.validators || {}
    options.selectors = options.selectors || {}

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
    this.kBucketSize = options.kBucketSize || c.K

    /**
     * ALPHA concurrency at which each query path with run, defaults to 3
     * @type {number}
     */
    this.concurrency = options.concurrency || c.ALPHA

    /**
     * Number of disjoint query paths to use
     * This is set to `kBucketSize`/2 per the S/Kademlia paper
     * @type {number}
     */
    this.disjointPaths = Math.ceil(this.kBucketSize / 2)

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

    this.validators = {
      pk: libp2pRecord.validator.validators.pk,
      ...options.validators
    }

    this.selectors = {
      pk: libp2pRecord.selection.selectors.pk,
      ...options.selectors
    }

    this.network = new Network(this)

    this._log = utils.logger(this.peerInfo.id)

    // Inject private apis so we don't clutter up this file
    const pa = privateApi(this)
    Object.keys(pa).forEach((name) => { this[name] = pa[name] })

    /**
     * Random walk management
     *
     * @type {RandomWalk}
     */
    this.randomWalk = new RandomWalk(this, options.randomWalk)

    /**
     * Keeps track of running queries
     *
     * @type {QueryManager}
     */
    this._queryManager = new QueryManager()
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
    this._queryManager.start()
    this.network.start((err) => {
      if (err) {
        return callback(err)
      }

      // Start random walk, it will not run if it's disabled
      this.randomWalk.start()
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
    this.randomWalk.stop()
    this.providers.stop()
    this._queryManager.stop()
    this.network.stop(callback)
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
   * @param {Object} options - get options
   * @param {number} options.minPeers - minimum peers that must be put to to consider this a successful operation
   * (default: closestPeers.length)
   * @param {function(Error)} callback
   * @returns {void}
   */
  put (key, value, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    } else {
      options = options || {}
    }

    this._log('PutValue %b', key)

    waterfall([
      (cb) => utils.createPutRecord(key, value, cb),
      (rec, cb) => waterfall([
        (cb) => this._putLocal(key, rec, cb),
        (cb) => this.getClosestPeers(key, { shallow: true }, cb),
        (peers, cb) => {
          // Ensure we have a default `minPeers`
          options.minPeers = options.minPeers || peers.length
          // filter out the successful puts
          filter(peers, (peer, cb) => {
            this._putValueToPeer(key, rec, peer, (err) => {
              if (err) {
                this._log.error('Failed to put to peer (%b): %s', peer.id, err)
                return cb(null, false)
              }
              cb(null, true)
            })
          }, (err, results) => {
            if (err) return cb(err)

            // Did we put to enough peers?
            if (options.minPeers > results.length) {
              const error = errcode(new Error('Failed to put value to enough peers'), 'ERR_NOT_ENOUGH_PUT_PEERS')
              this._log.error(error)
              return cb(error)
            }

            cb()
          })
        }
      ], cb)
    ], callback)
  }

  /**
   * Get the value to the given key.
   * Times out after 1 minute.
   *
   * @param {Buffer} key
   * @param {Object} options - get options
   * @param {number} options.timeout - optional timeout (default: 60000)
   * @param {function(Error, Buffer)} callback
   * @returns {void}
   */
  get (key, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    } else {
      options = options || {}
    }

    if (!options.maxTimeout && !options.timeout) {
      options.timeout = c.minute // default
    } else if (options.maxTimeout && !options.timeout) { // TODO this will be deprecated in a next release
      options.timeout = options.maxTimeout
    }

    this._get(key, options, callback)
  }

  /**
   * Get the `n` values to the given key without sorting.
   *
   * @param {Buffer} key
   * @param {number} nvals
   * @param {Object} options - get options
   * @param {number} options.timeout - optional timeout (default: 60000)
   * @param {function(Error, Array<{from: PeerId, val: Buffer}>)} callback
   * @returns {void}
   */
  getMany (key, nvals, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    } else {
      options = options || {}
    }

    if (!options.maxTimeout && !options.timeout) {
      options.timeout = c.minute // default
    } else if (options.maxTimeout && !options.timeout) { // TODO this will be deprecated in a next release
      options.timeout = options.maxTimeout
    }

    this._log('getMany %b (%s)', key, nvals)
    let vals = []

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

      if (vals.length >= nvals) {
        return callback(null, vals)
      }

      const paths = []
      waterfall([
        (cb) => utils.convertBuffer(key, cb),
        (id, cb) => {
          const rtp = this.routingTable.closestPeers(id, this.kBucketSize)

          this._log('peers in rt: %d', rtp.length)
          if (rtp.length === 0) {
            const errMsg = 'Failed to lookup key! No peers from routing table!'

            this._log.error(errMsg)
            return cb(errcode(new Error(errMsg), 'ERR_NO_PEERS_IN_ROUTING_TABLE'))
          }

          // we have peers, lets do the actual query to them
          const query = new Query(this, key, (pathIndex, numPaths) => {
            // This function body runs once per disjoint path
            const pathSize = utils.pathSize(nvals - vals.length, numPaths)
            const pathVals = []
            paths.push(pathVals)

            // Here we return the query function to use on this particular disjoint path
            return async (peer) => {
              let rec, peers, lookupErr
              try {
                const results = await this._getValueOrPeersAsync(peer, key)
                rec = results.record
                peers = results.peers
              } catch (err) {
                // If we have an invalid record we just want to continue and fetch a new one.
                if (err.code !== 'ERR_INVALID_RECORD') {
                  throw err
                }
                lookupErr = err
              }

              const res = { closerPeers: peers }

              if ((rec && rec.value) || lookupErr) {
                pathVals.push({
                  val: rec && rec.value,
                  from: peer
                })
              }

              // enough is enough
              if (pathVals.length >= pathSize) {
                res.pathComplete = true
              }

              return res
            }
          })

          // run our query
          timeout((_cb) => {
            promiseToCallback(query.run(rtp))(_cb)
          }, options.timeout)((err, res) => {
            query.stop()
            cb(err, res)
          })
        }
      ], (err) => {
        // combine vals from each path
        vals = [].concat.apply(vals, paths).slice(0, nvals)

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
   * @param {Object} options
   * @param {boolean} options.shallow shallow query
   * @param {function(Error, Array<PeerId>)} callback
   * @returns {void}
   */
  getClosestPeers (key, options, callback) {
    this._log('getClosestPeers to %b', key)

    if (typeof options === 'function') {
      callback = options
      options = {
        shallow: false
      }
    }

    utils.convertBuffer(key, (err, id) => {
      if (err) {
        return callback(err)
      }

      const tablePeers = this.routingTable.closestPeers(id, this.kBucketSize)

      const q = new Query(this, key, () => {
        // There is no distinction between the disjoint paths,
        // so there are no per-path variables in this scope.
        // Just return the actual query function.
        return async (peer) => {
          const closer = await this._closerPeersSingleAsync(key, peer)
          return {
            closerPeers: closer,
            pathComplete: options.shallow ? true : undefined
          }
        }
      })

      promiseToCallback(q.run(tablePeers))((err, res) => {
        if (err) {
          return callback(err)
        }

        if (!res || !res.finalSet) {
          return callback(null, [])
        }

        waterfall([
          (cb) => utils.sortClosestPeers(Array.from(res.finalSet), id, cb),
          (sorted, cb) => cb(null, sorted.slice(0, this.kBucketSize))
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

    const errors = []
    waterfall([
      // TODO: refactor this in method in async and remove this wrapper
      (cb) => promiseToCallback(this.providers.addProvider(key, this.peerInfo.id))(err => cb(err)),
      (cb) => this.getClosestPeers(key.buffer, cb),
      (peers, cb) => {
        const msg = new Message(Message.TYPES.ADD_PROVIDER, key.buffer, 0)
        msg.providerPeers = [this.peerInfo]

        each(peers, (peer, cb) => {
          this._log('putProvider %s to %s', key.toBaseEncodedString(), peer.toB58String())
          this.network.sendMessage(peer, msg, (err) => {
            if (err) errors.push(err)
            cb()
          })
        }, cb)
      }
    ], (err) => {
      if (errors.length) {
        // This should be infrequent. This means a peer we previously connected
        // to failed to exchange the provide message. If getClosestPeers was an
        // iterator, we could continue to pull until we announce to kBucketSize peers.
        err = errcode(`Failed to provide to ${errors.length} of ${this.kBucketSize} peers`, 'ERR_SOME_PROVIDES_FAILED', { errors })
      }
      callback(err)
    })
  }

  /**
   * Search the dht for up to `K` providers of the given CID.
   *
   * @param {CID} key
   * @param {Object} options - findProviders options
   * @param {number} options.timeout - how long the query should maximally run, in milliseconds (default: 60000)
   * @param {number} options.maxNumProviders - maximum number of providers to find
   * @param {function(Error, Array<PeerInfo>)} callback
   * @returns {void}
   */
  findProviders (key, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    } else {
      options = options || {}
    }

    if (!options.maxTimeout && !options.timeout) {
      options.timeout = c.minute // default
    } else if (options.maxTimeout && !options.timeout) { // TODO this will be deprecated in a next release
      options.timeout = options.maxTimeout
    }

    options.maxNumProviders = options.maxNumProviders || c.K

    this._log('findProviders %s', key.toBaseEncodedString())
    this._findNProviders(key, options.timeout, options.maxNumProviders, callback)
  }

  // ----------- Peer Routing

  /**
   * Search for a peer with the given ID.
   *
   * @param {PeerId} id
   * @param {Object} options - findPeer options
   * @param {number} options.timeout - how long the query should maximally run, in milliseconds (default: 60000)
   * @param {function(Error, PeerInfo)} callback
   * @returns {void}
   */
  findPeer (id, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    } else {
      options = options || {}
    }

    if (!options.maxTimeout && !options.timeout) {
      options.timeout = c.minute // default
    } else if (options.maxTimeout && !options.timeout) { // TODO this will be deprecated in a next release
      options.timeout = options.maxTimeout
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
          const peers = this.routingTable.closestPeers(key, this.kBucketSize)

          if (peers.length === 0) {
            return cb(errcode(new Error('Peer lookup failed'), 'ERR_LOOKUP_FAILED'))
          }

          // sanity check
          const match = peers.find((p) => p.isEqual(id))
          if (match && this.peerBook.has(id)) {
            this._log('found in peerbook')
            return cb(null, this.peerBook.get(id))
          }

          // query the network
          const query = new Query(this, id.id, () => {
            // There is no distinction between the disjoint paths,
            // so there are no per-path variables in this scope.
            // Just return the actual query function.
            return async (peer) => {
              const msg = await this._findPeerSingleAsync(peer, id)
              const match = msg.closerPeers.find((p) => p.id.isEqual(id))

              // found it
              if (match) {
                return {
                  peer: match,
                  queryComplete: true
                }
              }

              return {
                closerPeers: msg.closerPeers
              }
            }
          })

          timeout((_cb) => {
            promiseToCallback(query.run(peers))(_cb)
          }, options.timeout)((err, res) => {
            query.stop()
            cb(err, res)
          })
        },
        (result, cb) => {
          let success = false
          result.paths.forEach((result) => {
            if (result.success) {
              success = true
              this.peerBook.put(result.peer)
            }
          })
          this._log('findPeer %s: %s', id.toB58String(), success)
          if (!success) {
            return cb(errcode(new Error('No peer found'), 'ERR_NOT_FOUND'))
          }
          cb(null, this.peerBook.get(id))
        }
      ], callback)
    })
  }

  _peerDiscovered (peerInfo) {
    this.emit('peer', peerInfo)
  }
}

module.exports = KadDHT
