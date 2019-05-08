'use strict'

const PeerDistanceList = require('../peer-distance-list')
const EventEmitter = require('events')
const each = require('async/each')
const Path = require('./path')
const WorkerQueue = require('./workerQueue')
const utils = require('../utils')

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
    const numPaths = Math.min(this.query.dht.disjointPaths, peers.length)
    for (let i = 0; i < numPaths; i++) {
      paths.push(new Path(this, this.query.makePath(i, numPaths)))
    }

    // Assign peers to paths round-robin style
    peers.forEach((peer, i) => {
      paths[i % numPaths].addInitialPeer(peer)
    })

    // Execute the query along each disjoint path
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
      this.peersQueried = new PeerDistanceList(dhtKey, this.query.dht.kBucketSize)

      for (const cb of this.awaitingKey) {
        cb(err)
      }
      this.awaitingKey = undefined
    })
  }

  /**
   * If we've queried K peers, and the remaining peers in the given `worker`'s queue
   * are all further from the key than the peers we've already queried, then we should
   * stop querying on that `worker`.
   *
   * @param {WorkerQueue} worker
   * @param {function(Error, boolean)} callback
   * @returns {void}
   */
  continueQuerying (worker, callback) {
    // If we haven't queried K peers yet, keep going
    if (this.peersQueried.length < this.peersQueried.capacity) {
      return callback(null, true)
    }

    // Get all the peers that are currently being queried.
    // Note that this function gets called right after a peer has been popped
    // off the head of the closest peers queue so it will include that peer.
    const running = worker.queue.workersList().map(i => i.data)

    // Check if any of the peers that are currently being queried are closer
    // to the key than the peers we've already queried
    this.peersQueried.anyCloser(running, (err, someCloser) => {
      if (err) {
        return callback(err)
      }

      // Some are closer, the worker should keep going
      if (someCloser) {
        return callback(null, true)
      }

      // None are closer, the worker can stop
      callback(null, false)
    })
  }
}

module.exports = Run
