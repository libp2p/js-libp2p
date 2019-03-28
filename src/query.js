'use strict'

const waterfall = require('async/waterfall')
const each = require('async/each')
const queue = require('async/queue')
const mh = require('multihashes')

const c = require('./constants')
const PeerQueue = require('./peer-queue')
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
    this.concurrency = c.ALPHA
    this._log = utils.logger(this.dht.peerInfo.id, 'query:' + mh.toB58String(key))
  }

  /**
   * Run this query, start with the given list of peers first.
   *
   * @param {Array<PeerId>} peers
   * @param {function(Error, Object)} callback
   * @returns {void}
   */
  run (peers, callback) {
    const run = {
      peersSeen: new Set(),
      errors: [],
      paths: null // array of states per disjoint path
    }

    if (peers.length === 0) {
      this._log.error('Running query with no peers')
      return callback()
    }

    // create correct number of paths
    const numPaths = Math.min(c.DISJOINT_PATHS, peers.length)
    const pathPeers = []
    for (let i = 0; i < numPaths; i++) {
      pathPeers.push([])
    }

    // assign peers to paths round-robin style
    peers.forEach((peer, i) => {
      pathPeers[i % numPaths].push(peer)
    })
    run.paths = pathPeers.map((peers, i) => {
      return {
        peers,
        run,
        query: this.makePath(i, numPaths),
        peersToQuery: null
      }
    })

    // Create a manager to keep track of the worker queue for each path
    this.workerManager = new WorkerManager()
    each(run.paths, (path, cb) => {
      waterfall([
        (cb) => PeerQueue.fromKey(this.key, cb),
        (q, cb) => {
          path.peersToQuery = q
          each(path.peers, (p, cb) => addPeerToQuery(p, this.dht, path, cb), cb)
        },
        (cb) => {
          this.workerManager.workerQueue(this, path, cb)
        }
      ], cb)
    }, (err, results) => {
      this._log('query:done')

      // Ensure worker queues for all paths are stopped at the end of the query
      this.workerManager.stop()

      if (err) {
        return callback(err)
      }

      if (run.errors.length === run.peersSeen.size) {
        return callback(run.errors[0])
      }

      run.res = {
        finalSet: run.peersSeen,
        paths: []
      }

      run.paths.forEach((path) => {
        if (path.res && (path.res.pathComplete || path.res.queryComplete)) {
          path.res.success = true
          run.res.paths.push(path.res)
        }
      })

      callback(null, run.res)
    })
  }

  /**
   * Stop the query
   */
  stop () {
    this.workerManager && this.workerManager.stop()
  }
}

/**
 * Manages the worker queues for each path through the DHT
 */
class WorkerManager {
  /**
   * Creates a new WorkerManager
   */
  constructor () {
    this.running = true
    this.workers = []
  }

  /**
   * Stop all the workers
   */
  stop () {
    this.running = false
    for (const worker of this.workers) {
      worker.stop()
    }
  }

  /**
   * Use the queue from async to keep `concurrency` amount items running
   * per path.
   *
   * @param {Query} query
   * @param {Object} path
   * @param {function(Error)} callback
   */
  workerQueue (query, path, callback) {
    let workerRunning = true
    const q = queue((next, cb) => {
      query._log('queue:work')
      this.execQuery(next, query, path, (err, state) => {
        // Ignore response after worker killed
        if (!workerRunning || !this.running) {
          return cb()
        }

        query._log('queue:work:done', err, state)
        if (err) {
          return cb(err)
        }

        // If query is complete, stop all workers.
        // Note: this.stop() calls stop() on all the workers, which kills the
        // queue and calls callback(), so we don't need to call cb() here
        if (state && state.queryComplete) {
          query._log('query:complete')
          return this.stop()
        }

        // If path is complete, just stop this worker.
        // Note: worker.stop() kills the queue and calls callback() so we don't
        // need to call cb() here
        if (state && state.pathComplete) {
          return worker.stop()
        }

        // Otherwise, process next peer
        cb()
      })
    }, query.concurrency)

    // Keeps track of a running worker
    const worker = {
      stop: (err) => {
        if (workerRunning) {
          q.kill()
          workerRunning = false
          callback(err)
        }
      }
    }
    this.workers.push(worker)

    // Add peers to the queue until there are enough to satisfy the concurrency
    const fill = () => {
      query._log('queue:fill')
      while (q.length() < query.concurrency &&
             path.peersToQuery.length > 0) {
        q.push(path.peersToQuery.dequeue())
      }
    }

    fill()

    // If there's an error, stop the worker
    q.error = (err) => {
      query._log.error('queue', err)
      worker.stop(err)
    }

    // When all peers in the queue have been processed, stop the worker
    q.drain = () => {
      query._log('queue:drain')
      worker.stop()
    }

    // When a space opens up in the queue, add some more peers
    q.unsaturated = () => {
      query._log('queue:unsaturated')
      fill()
    }

    q.buffer = 0
  }

  /**
   * Execute a query on the `next` peer.
   *
   * @param {PeerId} next
   * @param {Query} query
   * @param {Object} path
   * @param {function(Error)} callback
   * @returns {void}
   * @private
   */
  execQuery (next, query, path, callback) {
    path.query(next, (err, res) => {
      // If the run has completed, bail out
      if (!this.running) {
        return callback()
      }

      if (err) {
        path.run.errors.push(err)
        callback()
      } else if (res.pathComplete || res.queryComplete) {
        path.res = res
        callback(null, {
          pathComplete: res.pathComplete,
          queryComplete: res.queryComplete
        })
      } else if (res.closerPeers && res.closerPeers.length > 0) {
        each(res.closerPeers, (closer, cb) => {
          // don't add ourselves
          if (query.dht._isSelf(closer.id)) {
            return cb()
          }
          closer = query.dht.peerBook.put(closer)
          query.dht._peerDiscovered(closer)
          addPeerToQuery(closer.id, query.dht, path, cb)
        }, callback)
      } else {
        callback()
      }
    })
  }
}

/**
 * Add a peer to the peers to be queried.
 *
 * @param {PeerId} next
 * @param {DHT} dht
 * @param {Object} path
 * @param {function(Error)} callback
 * @returns {void}
 * @private
 */
function addPeerToQuery (next, dht, path, callback) {
  const run = path.run
  if (dht._isSelf(next)) {
    return callback()
  }

  if (run.peersSeen.has(next)) {
    return callback()
  }

  run.peersSeen.add(next)
  path.peersToQuery.enqueue(next, callback)
}

module.exports = Query
