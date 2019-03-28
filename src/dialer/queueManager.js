'use strict'

const once = require('once')
const Queue = require('./queue')
const { DIAL_ABORTED } = require('../errors')
const noop = () => {}

class DialQueueManager {
  /**
   * @constructor
   * @param {Switch} _switch
   */
  constructor (_switch) {
    this._queue = []
    this._queues = {}
    this.switch = _switch
    this.dials = 0
  }

  /**
   * Iterates over all items in the DialerQueue
   * and executes there callback with an error.
   *
   * This causes the entire DialerQueue to be drained
   */
  abort () {
    // Abort items in the general queue
    while (this._queue.length > 0) {
      let dial = this._queue.shift()
      dial.callback(DIAL_ABORTED())
    }

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

    // If the target queue is currently running, just add the dial
    // directly to it. This acts as a crude priority lane for multiple
    // calls to a peer.
    const targetQueue = this.getQueue(peerInfo)
    if (targetQueue.isRunning) {
      targetQueue.add(protocol, useFSM, callback)
      return
    }

    this._queue.push({ peerInfo, protocol, useFSM, callback })
    this.run()
  }

  /**
   * Will execute up to `MAX_PARALLEL_DIALS` dials
   */
  run () {
    if (this.dials < this.switch.dialer.MAX_PARALLEL_DIALS && this._queue.length > 0) {
      let { peerInfo, protocol, useFSM, callback } = this._queue.shift()
      let dialQueue = this.getQueue(peerInfo)
      if (dialQueue.add(protocol, useFSM, callback)) {
        this.dials++
      }
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
   */
  _onQueueStopped () {
    this.dials--
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
