'use strict'

const PeerDistanceList = require('../peer-list/peer-distance-list')
const EventEmitter = require('events')

const Path = require('./path')
const WorkerQueue = require('./worker-queue')
const utils = require('../utils')

/**
 * @typedef {import('peer-id')} PeerId
 */

/**
 * Manages a single run of the query.
 */
class Run extends EventEmitter {
  /**
   * Creates a Run.
   *
   * @param {import('./index')} query
   */
  constructor (query) {
    super()

    this.query = query

    this.running = false

    /** @type {WorkerQueue[]} */
    this.workers = []

    // The peers that have been queried (including error responses)
    this.peersSeen = new Set()

    // The errors received when querying peers
    /** @type {Error[]} */
    this.errors = []

    // The closest K peers that have been queried successfully
    // (this member is initialized when the worker queues start)
    /** @type {PeerDistanceList | null} */
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
   * @param {PeerId[]} peers
   */
  async execute (peers) {
    /** @type {import('./path')[]} */
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
    await this.executePaths(paths)

    const res = {
      // The closest K peers we were able to query successfully
      finalSet: new Set(this.peersQueried && this.peersQueried.peers),

      /** @type {import('./index').QueryResult[]} */
      paths: []
    }

    // Collect the results from each completed path
    for (const path of paths) {
      if (path.res && (path.res.pathComplete || path.res.queryComplete)) {
        path.res.success = true
        res.paths.push(path.res)
      }
    }

    return res
  }

  /**
   * Execute all paths through the DHT.
   *
   * @param {Array<Path>} paths
   * @returns {Promise<void>}
   */
  async executePaths (paths) {
    this.running = true

    this.emit('start')
    try {
      await Promise.all(paths.map(path => path.execute()))
    } finally {
      // Ensure all workers are stopped
      this.stop()
      // Completed the Run
      this.emit('complete')
    }

    // If all queries errored out, something is seriously wrong, so callback
    // with an error
    if (this.errors.length === this.peersSeen.size) {
      throw this.errors[0]
    }
  }

  /**
   * Initialize the list of queried peers, then start a worker queue for the
   * given path.
   *
   * @param {Path} path
   * @returns {Promise<void>}
   */
  async workerQueue (path) {
    await this.init()
    await this.startWorker(path)
  }

  /**
   * Create and start a worker queue for a particular path.
   *
   * @param {Path} path
   * @returns {Promise<void>}
   */
  async startWorker (path) {
    const worker = new WorkerQueue(this.query.dht, this, path, this.query._log)
    this.workers.push(worker)
    await worker.execute()
  }

  /**
   * Initialize the list of closest peers we've queried - this is shared by all
   * paths in the run.
   *
   * @returns {Promise<void>}
   */
  async init () {
    if (this.peersQueried) {
      return
    }

    // We only want to initialize the PeerDistanceList once for the run
    if (this.peersQueriedPromise) {
      await this.peersQueriedPromise
      return
    }

    // This promise is temporarily stored so that others may await its completion
    this.peersQueriedPromise = (async () => {
      const dhtKey = await utils.convertBuffer(this.query.key)
      this.peersQueried = new PeerDistanceList(dhtKey, this.query.dht.kBucketSize)
    })()

    // After PeerDistanceList is initialized, clean up
    await this.peersQueriedPromise
    delete this.peersQueriedPromise
  }

  /**
   * If we've queried K peers, and the remaining peers in the given `worker`'s queue
   * are all further from the key than the peers we've already queried, then we should
   * stop querying on that `worker`.
   *
   * @param {WorkerQueue} worker
   * @returns {Promise<boolean>}
   */
  async continueQuerying (worker) {
    // If we haven't queried K peers yet, keep going
    if (this.peersQueried && this.peersQueried.length < this.peersQueried.capacity) {
      return true
    }

    // Get all the peers that are currently being queried.
    // Note that this function gets called right after a peer has been popped
    // off the head of the closest peers queue so it will include that peer.
    const running = Array.from(worker.queuedPeerIds)

    // Check if any of the peers that are currently being queried are closer
    // to the key than the peers we've already queried
    const someCloser = this.peersQueried && await this.peersQueried.anyCloser(running)

    // Some are closer, the worker should keep going
    if (someCloser) {
      return true
    }

    // None are closer, the worker can stop
    return false
  }
}

module.exports = Run
