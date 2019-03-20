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
    this._queue = {}
    this.switch = _switch
  }

  /**
   * Iterates over all items in the DialerQueue
   * and executes there callback with an error.
   *
   * This causes the entire DialerQueue to be drained
   */
  abort () {
    const queues = Object.values(this._queue)
    queues.forEach(dialQueue => {
      dialQueue.abort()
    })
  }

  /**
   * Adds the `dialRequest` to the queue and ensures the queue is running
   *
   * @param {DialRequest} dialRequest
   */
  add ({ peerInfo, protocol, useFSM, callback }) {
    callback = callback ? once(callback) : noop

    let dialQueue = this.getQueue(peerInfo)
    dialQueue.add(protocol, useFSM, callback)
  }

  /**
   * Returns the `Queue` for the given `peerInfo`
   * @param {PeerInfo} peerInfo
   * @returns {Queue}
   */
  getQueue (peerInfo) {
    const id = peerInfo.id.toB58String()

    this._queue[id] = this._queue[id] || new Queue(peerInfo, this.switch)
    return this._queue[id]
  }
}

module.exports = DialQueueManager
