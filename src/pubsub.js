'use strict'

const errCode = require('err-code')
const { messages, codes } = require('./errors')
const uint8ArrayFromString = require('uint8arrays/from-string')

module.exports = (node, Pubsub, config) => {
  const pubsub = new Pubsub(node.peerId, node.registrar, config)

  return {
    /**
     * Subscribe the given handler to a pubsub topic
     * @param {string} topic
     * @param {function} handler The handler to subscribe
     * @returns {void}
     */
    subscribe: (topic, handler) => {
      if (!node.isStarted() && !pubsub.started) {
        throw errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED)
      }

      if (pubsub.listenerCount(topic) === 0) {
        pubsub.subscribe(topic)
      }

      pubsub.on(topic, handler)
    },

    /**
     * Unsubscribes from a pubsub topic
     * @param {string} topic
     * @param {function} [handler] The handler to unsubscribe from
     */
    unsubscribe: (topic, handler) => {
      if (!node.isStarted() && !pubsub.started) {
        throw errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED)
      }

      if (!handler) {
        pubsub.removeAllListeners(topic)
      } else {
        pubsub.removeListener(topic, handler)
      }

      if (pubsub.listenerCount(topic) === 0) {
        pubsub.unsubscribe(topic)
      }
    },

    /**
     * Publish messages to the given topics.
     * @param {Array<string>|string} topic
     * @param {Uint8Array} data
     * @returns {Promise<void>}
     */
    publish: (topic, data) => {
      if (!node.isStarted() && !pubsub.started) {
        throw errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED)
      }

      if (typeof data === 'string' || data instanceof 'String') {
        data = uint8ArrayFromString(data)
      }

      try {
        data = Uint8Array.from(data)
      } catch (err) {
        throw errCode(new Error('data must be convertible to a Uint8Array'), 'ERR_DATA_IS_NOT_VALID')
      }

      return pubsub.publish(topic, data)
    },

    /**
     * Get a list of topics the node is subscribed to.
     * @returns {Array<String>} topics
     */
    getTopics: () => {
      if (!node.isStarted() && !pubsub.started) {
        throw errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED)
      }

      return pubsub.getTopics()
    },

    /**
     * Get a list of the peer-ids that are subscribed to one topic.
     * @param {string} topic
     * @returns {Array<string>}
     */
    getSubscribers: (topic) => {
      if (!node.isStarted() && !pubsub.started) {
        throw errCode(new Error(messages.NOT_STARTED_YET), codes.PUBSUB_NOT_STARTED)
      }

      return pubsub.getSubscribers(topic)
    },

    setMaxListeners (n) {
      return pubsub.setMaxListeners(n)
    },

    _pubsub: pubsub,

    start: () => pubsub.start(),

    stop: () => pubsub.stop()
  }
}
