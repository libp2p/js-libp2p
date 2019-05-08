'use strict'

const each = require('async/each')
const queue = require('async/queue')

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

    this.concurrency = this.dht.concurrency
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
    this.log('worker:stop, %d workers still running', this.run.workers.filter(w => w.running).length)
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
    this.run.continueQuerying(this, (err, continueQuerying) => {
      if (!this.running) {
        return cb()
      }

      if (err) {
        return cb(err)
      }

      // No peer we're querying is closer stop the queue
      // This will cause queries that may potentially result in
      // closer nodes to be ended, but it reduces overall query time
      if (!continueQuerying) {
        this.stop()
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

module.exports = WorkerQueue
