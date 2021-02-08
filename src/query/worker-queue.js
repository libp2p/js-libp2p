'use strict'

const { default: Queue } = require('p-queue')

/**
 * @typedef {import('peer-id')} PeerId
 */

class WorkerQueue {
  /**
   * Creates a new WorkerQueue.
   *
   * @param {import('../index')} dht
   * @param {import('./run')} run
   * @param {import('./path')} path
   * @param {Function & {error: Function}} log
   */
  constructor (dht, run, path, log) {
    this.dht = dht
    this.run = run
    this.path = path
    this.log = log

    this.concurrency = this.dht.concurrency
    this.queue = this.setupQueue()
    // a container for resolve/reject functions that will be populated
    // when execute() is called

    /** @type {{ resolve: (result?: any) => void, reject: (err: Error) => void} | null} */
    this.execution = null

    /** @type {Set<PeerId>} */
    this.queuedPeerIds = new Set()
  }

  /**
   * Create the underlying async queue.
   *
   * @returns {Queue}
   */
  setupQueue () {
    const q = new Queue({
      concurrency: this.concurrency
    })

    // When all peers in the queue have been processed, stop the worker
    q.on('idle', () => {
      if (this.path.peersToQuery && !this.path.peersToQuery.length) {
        this.log('queue:drain')
        this.stop()
      }
    })

    // When a space opens up in the queue, add some more peers
    q.on('next', () => {
      if (!this.running) {
        return
      }

      if (q.pending < this.concurrency) {
        this.fill()
      }
    })

    return q
  }

  /**
   * Stop the worker, optionally providing an error to pass to the worker's
   * callback.
   *
   * @param {Error} [err]
   */
  stop (err) {
    if (!this.running) {
      return
    }

    this.running = false
    this.queue.clear()
    this.log('worker:stop, %d workers still running', this.run.workers.filter(w => w.running).length)

    if (this.execution) {
      if (err) {
        this.execution.reject(err)
      } else {
        this.execution.resolve()
      }
    }
  }

  /**
   * Use the queue from async to keep `concurrency` amount items running
   * per path.
   *
   * @returns {Promise<void>}
   */
  async execute () {
    this.running = true
    // store the promise resolution functions to be resolved at end of queue
    this.execution = null
    const execPromise = new Promise((resolve, reject) => {
      this.execution = {
        resolve, reject
      }
    })
    // start queue
    this.fill()
    // await completion
    await execPromise
  }

  /**
   * Add peers to the worker queue until there are enough to satisfy the
   * worker queue concurrency.
   * Note that we don't want to take any more than those required to satisfy
   * concurrency from the peers-to-query queue, because we always want to
   * query the closest peers to the key first, and new peers are continuously
   * being added to the peers-to-query queue.
   */
  fill () {
    if (!this.path.peersToQuery) {
      return
    }

    // Note:
    // - queue.pending: number of items that are currently running
    // - queue.size: the number of items that are waiting to be run
    while (this.queue.pending + this.queue.size < this.concurrency && this.path.peersToQuery.length > 0) {
      const peer = this.path.peersToQuery.dequeue()

      // store the peer id so we can potentially abort early
      this.queuedPeerIds.add(peer)

      this.queue.add(
        () => {
          return this.processNext(peer)
            .catch(err => {
              this.log.error('queue', err)
              this.stop(err)
            })
            .finally(() => {
              this.queuedPeerIds.delete(peer)
            })
        }
      )
    }
  }

  /**
   * Process the next peer in the queue
   *
   * @param {PeerId} peer
   */
  async processNext (peer) {
    if (!this.running) {
      return
    }

    // The paths must be disjoint, meaning that no two paths in the Query may
    // traverse the same peer
    if (this.run.peersSeen.has(peer.toB58String())) {
      return
    }

    // Check if we've queried enough peers already
    let continueQuerying, continueQueryingError
    try {
      continueQuerying = await this.run.continueQuerying(this)
    } catch (err) {
      continueQueryingError = err
    }

    // Abort and ignore any error if we're no longer running
    if (!this.running) {
      return
    }

    if (continueQueryingError) {
      throw continueQueryingError
    }

    // No peer we're querying is closer, stop the queue
    // This will cause queries that may potentially result in
    // closer nodes to be ended, but it reduces overall query time
    if (!continueQuerying) {
      this.stop()
      return
    }

    // Check if another path has queried this peer in the mean time
    if (this.run.peersSeen.has(peer.toB58String())) {
      return
    }
    this.run.peersSeen.add(peer.toB58String())

    // Execute the query on the next peer
    this.log('queue:work')
    let state, execError
    try {
      state = await this.execQuery(peer)
    } catch (err) {
      execError = err
    }

    // Abort and ignore any error if we're no longer running
    if (!this.running) {
      return
    }

    this.log('queue:work:done', execError, state)

    if (execError) {
      throw execError
    }

    // If query is complete, stop all workers.
    // Note: run.stop() calls stop() on all the workers, which kills the
    // queue and resolves execution
    if (state && state.queryComplete) {
      this.log('query:complete')
      this.run.stop()
      return
    }

    // If path is complete, just stop this worker.
    // Note: this.stop() kills the queue and resolves execution
    if (state && state.pathComplete) {
      this.stop()
    }
  }

  /**
   * Execute a query on the next peer.
   *
   * @param {PeerId} peer
   */
  async execQuery (peer) {
    let res, queryError
    try {
      res = await this.path.queryFunc(peer)
    } catch (err) {
      queryError = err
    }

    // Abort and ignore any error if we're no longer running
    if (!this.running) {
      return
    }

    if (queryError) {
      this.run.errors.push(queryError)
      return
    }

    // Add the peer to the closest peers we have successfully queried
    this.run.peersQueried && await this.run.peersQueried.add(peer)

    if (!res) {
      return
    }

    // If the query indicates that this path or the whole query is complete
    // set the path result and bail out
    if (res.pathComplete || res.queryComplete) {
      this.path.res = res

      return {
        pathComplete: res.pathComplete,
        queryComplete: res.queryComplete
      }
    }

    // If there are closer peers to query, add them to the queue
    if (res.closerPeers && res.closerPeers.length > 0) {
      /**
       * @param {import('../').PeerData} closer
       */
      const queryCloser = async (closer) => {
        // don't add ourselves
        if (this.dht._isSelf(closer.id)) {
          return
        }

        this.dht._peerDiscovered(closer.id, closer.multiaddrs)
        await this.path.addPeerToQuery(closer.id)
      }

      await Promise.all(res.closerPeers.map(queryCloser))
    }
  }
}

module.exports = WorkerQueue
