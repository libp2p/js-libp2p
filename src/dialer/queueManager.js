'use strict'

const once = require('once')
const Queue = require('./queue')
const noop = () => {}

class DialQueueManager {
  /**
   * @constructor
   * @param {Switch} _switch
   */
  constructor (_switch) {
    this._queue = new Set()
    this._dialingQueues = new Set()
    this._queues = {}
    this.switch = _switch
  }

  /**
   * Iterates over all items in the DialerQueue
   * and executes there callback with an error.
   *
   * This causes the entire DialerQueue to be drained
   */
  abort () {
    // Clear the general queue
    this._queue.clear()

    // Abort the individual peer queues
    const queues = Object.values(this._queues)
    queues.forEach(dialQueue => {
      dialQueue.abort()
    })
  }

  /**
   * Adds the `dialRequest` to the queue and ensures the queue is running
   *
   * @param {DialRequest} dialRequest
   * @returns {void}
   */
  add ({ peerInfo, protocol, useFSM, callback }) {
    callback = callback ? once(callback) : noop

    // Add the dial to its respective queue
    const targetQueue = this.getQueue(peerInfo)
    targetQueue.add(protocol, useFSM, callback)

    // If we're already connected to the peer, start the queue now
    // While it might cause queues to go over the max parallel amount,
    // it avoids blocking peers we're already connected to
    if (peerInfo.isConnected()) {
      targetQueue.start()
      return
    }

    // Add the id to the general queue set if the queue isn't running
    // and if the queue is allowed to dial
    if (!targetQueue.isRunning && targetQueue.isDialAllowed()) {
      this._queue.add(targetQueue.id)
    }

    this.run()
  }

  /**
   * Will execute up to `MAX_PARALLEL_DIALS` dials
   */
  run () {
    if (this._dialingQueues.size < this.switch.dialer.MAX_PARALLEL_DIALS && this._queue.size > 0) {
      let nextQueue = this._queue.values().next()
      if (nextQueue.done) return

      this._queue.delete(nextQueue.value)
      let targetQueue = this._queues[nextQueue.value]
      this._dialingQueues.add(targetQueue.id)
      targetQueue.start()
    }
  }

  /**
   * Will remove the `peerInfo` from the dial blacklist
   * @param {PeerInfo} peerInfo
   */
  clearBlacklist (peerInfo) {
    this.getQueue(peerInfo).blackListed = null
  }

  /**
   * A handler for when dialing queues stop. This will trigger
   * `run()` in order to keep the queue processing.
   * @private
   * @param {string} id peer id of the queue that stopped
   */
  _onQueueStopped (id) {
    this._dialingQueues.delete(id)
    this.run()
  }

  /**
   * Returns the `Queue` for the given `peerInfo`
   * @param {PeerInfo} peerInfo
   * @returns {Queue}
   */
  getQueue (peerInfo) {
    const id = peerInfo.id.toB58String()

    this._queues[id] = this._queues[id] || new Queue(id, this.switch, this._onQueueStopped.bind(this))
    return this._queues[id]
  }
}

module.exports = DialQueueManager
