'use strict'

const nextTick = require('async/nextTick')
const { messages, codes } = require('./errors')
const FloodSub = require('libp2p-floodsub')
const promisify = require('promisify-es6')

const errCode = require('err-code')

module.exports = (node) => {
  const floodSub = new FloodSub(node)

  node._floodSub = floodSub

  return {
    /**
     * Subscribe the given handler to a pubsub topic
     *
     * @param {string} topic
     * @param {function} handler The handler to subscribe
     * @param {object|null} [options]
     * @param {function} [callback] An optional callback
     *
     * @returns {Promise|void} A promise is returned if no callback is provided
     *
     * @example <caption>Subscribe a handler to a topic</caption>
     *
     * // `null` must be passed for options until subscribe is no longer using promisify
     * const handler = (message) => { }
     * await libp2p.subscribe(topic, handler, null)
     *
     * @example <caption>Use a callback instead of the Promise api</caption>
     *
     * // `options` may be passed or omitted when supplying a callback
     * const handler = (message) => { }
     * libp2p.subscribe(topic, handler, callback)
     */
    subscribe: promisify((topic, handler, options, callback) => {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      if (!node.isStarted() && !floodSub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }

      function subscribe (cb) {
        if (floodSub.listenerCount(topic) === 0) {
          floodSub.subscribe(topic)
        }

        floodSub.on(topic, handler)
        nextTick(cb)
      }

      subscribe(callback)
    }),

    /**
     * Unsubscribes from a pubsub topic
     *
     * @param {string} topic
     * @param {function|null} handler The handler to unsubscribe from
     * @param {function} [callback] An optional callback
     *
     * @returns {Promise|void} A promise is returned if no callback is provided
     *
     * @example <caption>Unsubscribe a topic for all handlers</caption>
     *
     * // `null` must be passed until unsubscribe is no longer using promisify
     * await libp2p.unsubscribe(topic, null)
     *
     * @example <caption>Unsubscribe a topic for 1 handler</caption>
     *
     * await libp2p.unsubscribe(topic, handler)
     *
     * @example <caption>Use a callback instead of the Promise api</caption>
     *
     * libp2p.unsubscribe(topic, handler, callback)
     */
    unsubscribe: promisify((topic, handler, callback) => {
      if (!node.isStarted() && !floodSub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }

      if (!handler) {
        floodSub.removeAllListeners(topic)
      } else {
        floodSub.removeListener(topic, handler)
      }

      if (floodSub.listenerCount(topic) === 0) {
        floodSub.unsubscribe(topic)
      }

      if (typeof callback === 'function') {
        return nextTick(() => callback())
      }

      return Promise.resolve()
    }),

    publish: promisify((topic, data, callback) => {
      if (!node.isStarted() && !floodSub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }

      if (!Buffer.isBuffer(data)) {
        return nextTick(callback, errCode(new Error('data must be a Buffer'), 'ERR_DATA_IS_NOT_A_BUFFER'))
      }

      floodSub.publish(topic, data, callback)
    }),

    ls: promisify((callback) => {
      if (!node.isStarted() && !floodSub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }

      const subscriptions = Array.from(floodSub.subscriptions)

      nextTick(() => callback(null, subscriptions))
    }),

    peers: promisify((topic, callback) => {
      if (!node.isStarted() && !floodSub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }

      if (typeof topic === 'function') {
        callback = topic
        topic = null
      }

      const peers = Array.from(floodSub.peers.values())
        .filter((peer) => topic ? peer.topics.has(topic) : true)
        .map((peer) => peer.info.id.toB58String())

      nextTick(() => callback(null, peers))
    }),

    setMaxListeners (n) {
      return floodSub.setMaxListeners(n)
    }
  }
}
