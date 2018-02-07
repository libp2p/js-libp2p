'use strict'

module.exports = (node) => {
  return {
    findProviders: (key, timeout, callback) => {
      if (!node._dht) {
        return callback(new Error('DHT is not available'))
      }

      node._dht.findProviders(key, timeout, callback)
    },
    provide: (key, callback) => {
      if (!node._dht) {
        return callback(new Error('DHT is not available'))
      }

      node._dht.provide(key, callback)
    }
  }
}
