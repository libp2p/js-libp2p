'use strict'

/**
 * @typedef {import('libp2p-interfaces/src/pubsub').InMessage} InMessage
 */

// Pubsub adapter to keep API with handlers while not removed.
module.exports = (PubsubRouter, libp2p, options) => {
  class Pubsub extends PubsubRouter {
    /**
     * Subscribes to a given topic.
     *
     * @override
     * @param {string} topic
     * @param {function(msg: InMessage)} [handler]
     * @returns {void}
     */
    subscribe (topic, handler) {
      // Bind provided handler
      handler && this.on(topic, handler)
      super.subscribe(topic)
    }

    /**
     * Unsubscribe from the given topic.
     *
     * @override
     * @param {string} topic
     * @param {function(msg: InMessage)} [handler]
     * @returns {void}
     */
    unsubscribe (topic, handler) {
      if (!handler) {
        this.removeAllListeners(topic)
      } else {
        this.removeListener(topic, handler)
      }

      if (this.listenerCount(topic) === 0) {
        super.unsubscribe(topic)
      }
    }
  }

  return new Pubsub(libp2p, options)
}
