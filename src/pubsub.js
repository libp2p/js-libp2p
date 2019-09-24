'use strict'

const nextTick = require('async/nextTick')
const { messages, codes } = require('./errors')
const promisify = require('promisify-es6')

const errCode = require('err-code')

module.exports = (node, Pubsub, config) => {
  const pubsub = new Pubsub(node, config)

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
    subscribe: (topic, handler, options, callback) => {
      // can't use promisify because it thinks the handler is a callback
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      if (!node.isStarted() && !pubsub.started) {
        const err = errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED)

        if (callback) {
          return nextTick(() => callback(err))
        }

        return Promise.reject(err)
      }

      if (pubsub.listenerCount(topic) === 0) {
        pubsub.subscribe(topic)
      }

      pubsub.on(topic, handler)

      if (callback) {
        return nextTick(() => callback())
      }

      return Promise.resolve()
    },

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
    unsubscribe: (topic, handler, callback) => {
      // can't use promisify because it thinks the handler is a callback
      if (!node.isStarted() && !pubsub.started) {
        const err = errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED)

        if (callback) {
          return nextTick(() => callback(err))
        }

        return Promise.reject(err)
      }

      if (!handler) {
        pubsub.removeAllListeners(topic)
      } else {
        pubsub.removeListener(topic, handler)
      }

      if (pubsub.listenerCount(topic) === 0) {
        pubsub.unsubscribe(topic)
      }

      if (callback) {
        return nextTick(() => callback())
      }

      return Promise.resolve()
    },

    publish: promisify((topic, data, callback) => {
      if (!node.isStarted() && !pubsub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }

      try {
        data = Buffer.from(data)
      } catch (err) {
        return nextTick(callback, errCode(new Error('data must be convertible to a Buffer'), 'ERR_DATA_IS_NOT_VALID'))
      }

      pubsub.publish(topic, data, callback)
    }),

    ls: promisify((callback) => {
      if (!node.isStarted() && !pubsub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }

      const subscriptions = Array.from(pubsub.subscriptions)

      nextTick(() => callback(null, subscriptions))
    }),

    peers: promisify((topic, callback) => {
      if (!node.isStarted() && !pubsub.started) {
        return nextTick(callback, errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED))
      }

      if (typeof topic === 'function') {
        callback = topic
        topic = null
      }

      const peers = Array.from(pubsub.peers.values())
        .filter((peer) => topic ? peer.topics.has(topic) : true)
        .map((peer) => peer.info.id.toB58String())

      nextTick(() => callback(null, peers))
    }),

    setMaxListeners (n) {
      return pubsub.setMaxListeners(n)
    },

    start: promisify((cb) => pubsub.start(cb)),

    stop: promisify((cb) => pubsub.stop(cb))
  }
}
