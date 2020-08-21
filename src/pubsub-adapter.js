'use strict'

// Pubsub adapter to keep API with handlers while not removed.
module.exports = (PubsubRouter, libp2p, options) => {
  class Pubsub extends PubsubRouter {
    /**
     * Subscribes to a given topic.
     * @override
     * @param {string} topic
     * @param {function(msg: InMessage)} [handler]
     * @returns {void}
     */
    subscribe (topic, handler) {
      super.subscribe(topic)

      // Bind provided handler
      handler && this.on(topic, handler)
    }

    /**
     * Unsubscribe from the given topic.
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

      super.unsubscriber(topic)
    }
  }

  return new Pubsub(libp2p, options)
}
