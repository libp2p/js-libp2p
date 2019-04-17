'use strict'

const EventEmitter = require('events')
const waterfall = require('async/waterfall')
const each = require('async/each')
const queue = require('async/queue')
const mh = require('multihashes')

const c = require('./constants')
const PeerQueue = require('./peer-queue')
const PeerDistanceList = require('./peer-distance-list')
const utils = require('./utils')

/**
 * Divide peers up into disjoint paths (subqueries). Any peer can only be used once over all paths.
 * Within each path, query peers from closest to farthest away.
 */
class Query {
  /**
   * User-supplied function to set up an individual disjoint path. Per-path
   * query state should be held in this function's closure.
   * @typedef {makePath} function
   * @param {number} pathNum - Numeric index from zero to numPaths - 1
   * @returns {queryFunc} - Function to call on each peer in the query
   */

  /**
   * Query function.
   * @typedef {queryFunc} function
   * @param {PeerId} next - Peer to query
   * @param {function(Error, Object)} callback - Query result callback
   */

  /**
   * Create a new query. The makePath function is called once per disjoint path, so that per-path
   * variables can be created in that scope. makePath then returns the actual query function (queryFunc) to
   * use when on that path.
   *
   * @param {DHT} dht - DHT instance
   * @param {Buffer} key
   * @param {makePath} makePath - Called to set up each disjoint path. Must return the query function.
   */
  constructor (dht, key, makePath) {
    this.dht = dht
    this.key = key
    this.makePath = makePath
    this._log = utils.logger(this.dht.peerInfo.id, 'query:' + mh.toB58String(key))

    this.running = false

    this._onStart = this._onStart.bind(this)
    this._onComplete = this._onComplete.bind(this)
  }

  /**
   * Run this query, start with the given list of peers first.
   *
   * @param {Array<PeerId>} peers
   * @param {function(Error, Object)} callback
   * @returns {void}
   */
  run (peers, callback) {
    if (!this.dht._queryManager.running) {
      this._log.error('Attempt to run query after shutdown')
      return callback(null, { finalSet: new Set(), paths: [] })
    }

    if (peers.length === 0) {
      this._log.error('Running query with no peers')
      return callback(null, { finalSet: new Set(), paths: [] })
    }

    this.run = new Run(this)
    this.run.once('start', this._onStart)
    this.run.once('complete', this._onComplete)
    this.run.execute(peers, callback)
  }

  /**
   * Called when the run starts.
   */
  _onStart () {
    this.running = true
    this._log('query:start')

    // Register this query so we can stop it if the DHT stops
    this.dht._queryManager.queryStarted(this)
  }

  /**
   * Called when the run completes (even if there's an error).
   */
  _onComplete () {
    this._log('query:done')

    // Ensure worker queues for all paths are stopped at the end of the query
    this.stop()
  }

  /**
   * Stop the query.
   */
  stop () {
    if (!this.running) {
      return
    }

    this.run.removeListener('start', this._onStart)
    this.run.removeListener('complete', this._onComplete)

    this.running = false
    this.run && this.run.stop()
    this.dht._queryManager.queryCompleted(this)
  }
}

/**
 * Manages a single run of the query.
 */
class Run extends EventEmitter {
  /**
   * Creates a Run.
   *
   * @param {Query} query
   */
  constructor (query) {
    super()

    this.query = query

    this.running = false
    this.workers = []

    // The peers that have been queried (including error responses)
    this.peersSeen = new Set()
    // The errors received when querying peers
    this.errors = []
    // The closest K peers that have been queried successfully
    // (this member is initialized when the worker queues start)
    this.peersQueried = null
  }

  /**
   * Stop all the workers
   */
  stop () {
    if (!this.running) {
      return
    }

    this.running = false
    for (const worker of this.workers) {
      worker.stop()
    }
  }

  /**
   * Execute the run with the given initial set of peers.
   *
   * @param {Array<PeerId>} peers
   * @param {function(Error, Object)} callback
   */
  execute (peers, callback) {
    const paths = [] // array of states per disjoint path

    // Create disjoint paths
    const numPaths = Math.min(c.DISJOINT_PATHS, peers.length)
    for (let i = 0; i < numPaths; i++) {
      paths.push(new Path(this, this.query.makePath(i, numPaths)))
    }

    // Assign peers to paths round-robin style
    peers.forEach((peer, i) => {
      paths[i % numPaths].addInitialPeer(peer)
    })

    // Execute the query along each disjoint path
    // each(paths, (path, cb) => path.execute(cb), (err) => {
    this.executePaths(paths, (err) => {
      if (err) {
        return callback(err)
      }

      const res = {
        // The closest K peers we were able to query successfully
        finalSet: new Set(this.peersQueried.peers),
        paths: []
      }

      // Collect the results from each completed path
      for (const path of paths) {
        if (path.res && (path.res.pathComplete || path.res.queryComplete)) {
          path.res.success = true
          res.paths.push(path.res)
        }
      }

      callback(err, res)
    })
  }

  /**
   * Execute all paths through the DHT.
   *
   * @param {Array<Path>} paths
   * @param {function(Error)} callback
   */
  executePaths (paths, callback) {
    this.running = true

    this.emit('start')
    each(paths, (path, cb) => path.execute(cb), (err) => {
      // Ensure all workers are stopped
      this.stop()

      // Completed the Run
      this.emit('complete')

      if (err) {
        return callback(err)
      }

      // If all queries errored out, something is seriously wrong, so callback
      // with an error
      if (this.errors.length === this.peersSeen.size) {
        return callback(this.errors[0])
      }

      callback()
    })
  }

  /**
   * Initialize the list of queried peers, then start a worker queue for the
   * given path.
   *
   * @param {Path} path
   * @param {function(Error)} callback
   */
  workerQueue (path, callback) {
    this.init(() => this.startWorker(path, callback))
  }

  /**
   * Create and start a worker queue for a particular path.
   *
   * @param {Path} path
   * @param {function(Error)} callback
   */
  startWorker (path, callback) {
    const worker = new WorkerQueue(this.query.dht, this, path, this.query._log)
    this.workers.push(worker)
    worker.execute(callback)
  }

  /**
   * Initialize the list of closest peers we've queried - this is shared by all
   * paths in the run.
   *
   * @param {function(Error)} callback
   * @returns {void}
   */
  init (callback) {
    if (this.peersQueried) {
      return callback()
    }

    // We only want to initialize it once for the run, and then inform each
    // path worker that it's ready
    if (this.awaitingKey) {
      this.awaitingKey.push(callback)
      return
    }

    this.awaitingKey = [callback]

    // Convert the key into a DHT key by hashing it
    utils.convertBuffer(this.query.key, (err, dhtKey) => {
      this.peersQueried = new PeerDistanceList(dhtKey, c.K)

      for (const cb of this.awaitingKey) {
        cb(err)
      }
      this.awaitingKey = undefined
    })
  }

  /**
   * If we've queried K peers, and the remaining peers in the queues are all
   * further from the key than the peers we've already queried, then we should
   * stop querying.
   *
   * @param {function(Error, boolean)} callback
   * @returns {void}
   */
  continueQuerying (callback) {
    // If we haven't queried K peers yet, keep going
    if (this.peersQueried.length < this.peersQueried.capacity) {
      return callback(null, true)
    }

    // Get all the peers that are currently being queried.
    // Note that this function gets called right after a peer has been popped
    // off the head of the closest peers queue so it will include that peer.
    let running = []
    for (const worker of this.workers) {
      const peerIds = worker.queue.workersList().map(i => i.data)
      running = running.concat(peerIds)
    }

    // Check if any of the peers that are currently being queried are closer
    // to the key than the peers we've already queried
    this.peersQueried.anyCloser(running, (err, someCloser) => {
      if (err) {
        return callback(err)
      }

      // Some are closer, keep going
      if (someCloser) {
        return callback(null, true)
      }

      // None are closer, so we can stop querying
      this.stop()
      callback(null, false)
    })
  }
}

/**
 * Manages a single Path through the DHT.
 */
class Path {
  /**
   * Creates a Path.
   *
   * @param {Run} run
   * @param {queryFunc} queryFunc
   */
  constructor (run, queryFunc) {
    this.run = run
    this.queryFunc = queryFunc
    this.initialPeers = []
  }

  /**
   * Add a peer to the set of peers that are used to intialize the path.
   *
   * @param {PeerId} peer
   */
  addInitialPeer (peer) {
    this.initialPeers.push(peer)
  }

  /**
   * Execute the path.
   *
   * @param {function(Error)} callback
   */
  execute (callback) {
    waterfall([
      // Create a queue of peers ordered by distance from the key
      (cb) => PeerQueue.fromKey(this.run.query.key, cb),
      // Add initial peers to the queue
      (q, cb) => {
        this.peersToQuery = q
        each(this.initialPeers, this.addPeerToQuery.bind(this), cb)
      },
      // Start processing the queue
      (cb) => {
        this.run.workerQueue(this, cb)
      }
    ], callback)
  }

  /**
   * Add a peer to the peers to be queried.
   *
   * @param {PeerId} peer
   * @param {function(Error)} callback
   * @returns {void}
   * @private
   */
  addPeerToQuery (peer, callback) {
    // Don't add self
    if (this.run.query.dht._isSelf(peer)) {
      return callback()
    }

    // The paths must be disjoint, meaning that no two paths in the Query may
    // traverse the same peer
    if (this.run.peersSeen.has(peer)) {
      return callback()
    }

    this.peersToQuery.enqueue(peer, callback)
  }
}

class WorkerQueue {
  /**
   * Creates a new WorkerQueue.
   *
   * @param {DHT} dht
   * @param {Run} run
   * @param {Object} path
   * @param {function} log
   */
  constructor (dht, run, path, log) {
    this.dht = dht
    this.run = run
    this.path = path
    this.log = log

    this.concurrency = c.ALPHA
    this.queue = this.setupQueue()
  }

  /**
   * Create the underlying async queue.
   *
   * @returns {Object}
   */
  setupQueue () {
    const q = queue(this.processNext.bind(this), this.concurrency)

    // If there's an error, stop the worker
    q.error = (err) => {
      this.log.error('queue', err)
      this.stop(err)
    }

    // When all peers in the queue have been processed, stop the worker
    q.drain = () => {
      this.log('queue:drain')
      this.stop()
    }

    // When a space opens up in the queue, add some more peers
    q.unsaturated = () => {
      if (this.running) {
        this.log('queue:unsaturated')
        this.fill()
      }
    }

    q.buffer = 0

    return q
  }

  /**
   * Stop the worker, optionally providing an error to pass to the worker's
   * callback.
   *
   * @param {Error} err
   */
  stop (err) {
    if (!this.running) {
      return
    }

    this.running = false
    this.queue.kill()
    this.callbackFn(err)
  }

  /**
   * Use the queue from async to keep `concurrency` amount items running
   * per path.
   *
   * @param {function(Error)} callback
   */
  execute (callback) {
    this.running = true
    this.callbackFn = callback
    this.fill()
  }

  /**
   * Add peers to the worker queue until there are enough to satisfy the
   * worker queue concurrency.
   * Note that we don't want to take any more than those required to satisfy
   * concurrency from the peers-to-query queue, because we always want to
   * query the closest peers to the key first, and new peers are continously
   * being added to the peers-to-query queue.
   */
  fill () {
    this.log('queue:fill')

    // Note:
    // - queue.running(): number of items that are currently running
    // - queue.length(): the number of items that are waiting to be run
    while (this.queue.running() + this.queue.length() < this.concurrency &&
           this.path.peersToQuery.length > 0) {
      this.queue.push(this.path.peersToQuery.dequeue())
    }
  }

  /**
   * Process the next peer in the queue
   *
   * @param {PeerId} peer
   * @param {function(Error)} cb
   * @returns {void}
   */
  processNext (peer, cb) {
    if (!this.running) {
      return cb()
    }

    // The paths must be disjoint, meaning that no two paths in the Query may
    // traverse the same peer
    if (this.run.peersSeen.has(peer)) {
      return cb()
    }

    // Check if we've queried enough peers already
    this.run.continueQuerying((err, continueQuerying) => {
      if (!this.running) {
        return cb()
      }

      if (err) {
        return cb(err)
      }

      // If we've queried enough peers, bail out
      if (!continueQuerying) {
        return cb()
      }

      // Check if another path has queried this peer in the mean time
      if (this.run.peersSeen.has(peer)) {
        return cb()
      }
      this.run.peersSeen.add(peer)

      // Execute the query on the next peer
      this.log('queue:work')
      this.execQuery(peer, (err, state) => {
        // Ignore response after worker killed
        if (!this.running) {
          return cb()
        }

        this.log('queue:work:done', err, state)
        if (err) {
          return cb(err)
        }

        // If query is complete, stop all workers.
        // Note: run.stop() calls stop() on all the workers, which kills the
        // queue and calls callbackFn()
        if (state && state.queryComplete) {
          this.log('query:complete')
          this.run.stop()
          return cb()
        }

        // If path is complete, just stop this worker.
        // Note: this.stop() kills the queue and calls callbackFn()
        if (state && state.pathComplete) {
          this.stop()
          return cb()
        }

        // Otherwise, process next peer
        cb()
      })
    })
  }

  /**
   * Execute a query on the next peer.
   *
   * @param {PeerId} peer
   * @param {function(Error)} callback
   * @returns {void}
   * @private
   */
  execQuery (peer, callback) {
    this.path.queryFunc(peer, (err, res) => {
      // If the run has completed, bail out
      if (!this.running) {
        return callback()
      }

      if (err) {
        this.run.errors.push(err)
        return callback()
      }

      // Add the peer to the closest peers we have successfully queried
      this.run.peersQueried.add(peer, (err) => {
        if (err) {
          return callback(err)
        }

        // If the query indicates that this path or the whole query is complete
        // set the path result and bail out
        if (res.pathComplete || res.queryComplete) {
          this.path.res = res
          return callback(null, {
            pathComplete: res.pathComplete,
            queryComplete: res.queryComplete
          })
        }

        // If there are closer peers to query, add them to the queue
        if (res.closerPeers && res.closerPeers.length > 0) {
          return each(res.closerPeers, (closer, cb) => {
            // don't add ourselves
            if (this.dht._isSelf(closer.id)) {
              return cb()
            }
            closer = this.dht.peerBook.put(closer)
            this.dht._peerDiscovered(closer)
            this.path.addPeerToQuery(closer.id, cb)
          }, callback)
        }

        callback()
      })
    })
  }
}

module.exports = Query
