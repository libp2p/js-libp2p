'use strict'

const once = require('once')
const Queue = require('./queue')
const { DIAL_ABORTED } = require('../errors')
const nextTick = require('async/nextTick')
const retimer = require('retimer')
const { QUARTER_HOUR, PRIORITY_HIGH } = require('../constants')
const debug = require('debug')
const log = debug('libp2p:switch:dial:manager')
const noop = () => {}

class DialQueueManager {
  /**
   * @constructor
   * @param {Switch} _switch
   */
  constructor (_switch) {
    this._queue = new Set()
    this._coldCallQueue = new Set()
    this._dialingQueues = new Set()
    this._queues = {}
    this.switch = _switch
    this._cleanInterval = retimer(this._clean.bind(this), QUARTER_HOUR)
    this.start()
  }

  /**
   * Runs through all queues, aborts and removes them if they
   * are no longer valid. A queue that is denylisted indefinitely,
   * is considered no longer valid.
   * @private
   */
  _clean () {
    const queues = Object.values(this._queues)
    queues.forEach(dialQueue => {
      // Clear if the queue has reached max denylist
      if (dialQueue.denylisted === Infinity) {
        dialQueue.abort()
        delete this._queues[dialQueue.id]
        return
      }

      // Keep track of denylisted queues
      if (dialQueue.denylisted) return

      // Clear if peer is no longer active
      // To avoid reallocating memory, dont delete queues of
      // connected peers, as these are highly likely to leverage the
      // queues in the immediate term
      if (!dialQueue.isRunning && dialQueue.length < 1) {
        let isConnected = false
        try {
          const peerInfo = this.switch._peerBook.get(dialQueue.id)
          isConnected = Boolean(peerInfo.isConnected())
        } catch (_) {
          // If we get an error, that means the peerbook doesnt have the peer
        }

        if (!isConnected) {
          dialQueue.abort()
          delete this._queues[dialQueue.id]
        }
      }
    })

    this._cleanInterval.reschedule(QUARTER_HOUR)
  }

  /**
   * Allows the `DialQueueManager` to execute dials
   */
  start () {
    this.isRunning = true
  }

  /**
   * Iterates over all items in the DialerQueue
   * and executes there callback with an error.
   *
   * This causes the entire DialerQueue to be drained
   */
  stop () {
    this.isRunning = false
    // Clear the general queue
    this._queue.clear()
    // Clear the cold call queue
    this._coldCallQueue.clear()

    this._cleanInterval.clear()

    // Abort the individual peer queues
    const queues = Object.values(this._queues)
    queues.forEach(dialQueue => {
      dialQueue.abort()
      delete this._queues[dialQueue.id]
    })
  }

  /**
   * Adds the `dialRequest` to the queue and ensures queue is running
   *
   * @param {DialRequest} dialRequest
   * @returns {void}
   */
  add ({ peerInfo, protocol, options, callback }) {
    callback = callback ? once(callback) : noop

    // Add the dial to its respective queue
    const targetQueue = this.getQueue(peerInfo)

    // Cold Call
    if (options.priority > PRIORITY_HIGH) {
      // If we have too many cold calls, abort the dial immediately
      if (this._coldCallQueue.size >= this.switch.dialer.MAX_COLD_CALLS) {
        return nextTick(callback, DIAL_ABORTED())
      }

      if (this._queue.has(targetQueue.id)) {
        return nextTick(callback, DIAL_ABORTED())
      }
    }

    targetQueue.add(protocol, options.useFSM, callback)

    // If we're already connected to the peer, start the queue now
    // While it might cause queues to go over the max parallel amount,
    // it avoids denying peers we're already connected to
    if (peerInfo.isConnected()) {
      targetQueue.start()
      return
    }

    // If dialing is not allowed, abort
    if (!targetQueue.isDialAllowed()) {
      return
    }

    // Add the id to its respective queue set if the queue isn't running
    if (!targetQueue.isRunning) {
      if (options.priority <= PRIORITY_HIGH) {
        this._queue.add(targetQueue.id)
        this._coldCallQueue.delete(targetQueue.id)
      // Only add it to the cold queue if it's not in the normal queue
      } else {
        this._coldCallQueue.add(targetQueue.id)
      }
    }

    this.run()
  }

  /**
   * Will execute up to `MAX_PARALLEL_DIALS` dials
   */
  run () {
    if (!this.isRunning) return

    if (this._dialingQueues.size < this.switch.dialer.MAX_PARALLEL_DIALS) {
      let nextQueue = { done: true }
      // Check the queue first and fall back to the cold call queue
      if (this._queue.size > 0) {
        nextQueue = this._queue.values().next()
        this._queue.delete(nextQueue.value)
      } else if (this._coldCallQueue.size > 0) {
        nextQueue = this._coldCallQueue.values().next()
        this._coldCallQueue.delete(nextQueue.value)
      }

      if (nextQueue.done) {
        return
      }

      const targetQueue = this._queues[nextQueue.value]

      if (!targetQueue) {
        log('missing queue %s, maybe it was aborted?', nextQueue.value)
        return
      }

      this._dialingQueues.add(targetQueue.id)
      targetQueue.start()
    }
  }

  /**
   * Will remove the `peerInfo` from the dial denylist
   * @param {PeerInfo} peerInfo
   */
  clearDenylist (peerInfo) {
    const queue = this.getQueue(peerInfo)
    queue.denylisted = null
    queue.denylistCount = 0
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
