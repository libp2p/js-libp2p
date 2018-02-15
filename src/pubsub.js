'use strict'

const setImmediate = require('async/setImmediate')
const NOT_STARTED_YET = require('./error-messages').NOT_STARTED_YET
const FloodSub = require('libp2p-floodsub')

module.exports = (node) => {
  const floodSub = new FloodSub(node)

  node._floodSub = floodSub

  return {
    subscribe: (topic, options, handler, callback) => {
      if (typeof options === 'function') {
        callback = handler
        handler = options
        options = {}
      }

      if (!node.isStarted() && !floodSub.started) {
        return setImmediate(() => callback(new Error(NOT_STARTED_YET)))
      }

      function subscribe (cb) {
        if (floodSub.listenerCount(topic) === 0) {
          floodSub.subscribe(topic)
        }

        floodSub.on(topic, handler)
        setImmediate(cb)
      }

      subscribe(callback)
    },

    unsubscribe: (topic, handler) => {
      if (!node.isStarted() && !floodSub.started) {
        throw new Error(NOT_STARTED_YET)
      }

      floodSub.removeListener(topic, handler)

      if (floodSub.listenerCount(topic) === 0) {
        floodSub.unsubscribe(topic)
      }
    },

    publish: (topic, data, callback) => {
      if (!node.isStarted() && !floodSub.started) {
        return setImmediate(() => callback(new Error(NOT_STARTED_YET)))
      }

      if (!Buffer.isBuffer(data)) {
        return setImmediate(() => callback(new Error('data must be a Buffer')))
      }

      floodSub.publish(topic, data)

      setImmediate(() => callback())
    },

    ls: (callback) => {
      if (!node.isStarted() && !floodSub.started) {
        return setImmediate(() => callback(new Error(NOT_STARTED_YET)))
      }

      const subscriptions = Array.from(floodSub.subscriptions)

      setImmediate(() => callback(null, subscriptions))
    },

    peers: (topic, callback) => {
      if (!node.isStarted() && !floodSub.started) {
        return setImmediate(() => callback(new Error(NOT_STARTED_YET)))
      }

      if (typeof topic === 'function') {
        callback = topic
        topic = null
      }

      const peers = Array.from(floodSub.peers.values())
        .filter((peer) => topic ? peer.topics.has(topic) : true)
        .map((peer) => peer.info.id.toB58String())

      setImmediate(() => callback(null, peers))
    },

    setMaxListeners (n) {
      return floodSub.setMaxListeners(n)
    }
  }
}
