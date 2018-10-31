'use strict'

module.exports = (node) => {
  return {
    put: (key, value, callback) => {
      if (!node._dht) {
        return callback(new Error('DHT is not available'))
      }

      node._dht.put(key, value, callback)
    },
    get: (key, options, callback) => {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      if (!node._dht) {
        return callback(new Error('DHT is not available'))
      }

      node._dht.get(key, options, callback)
    },
    getMany: (key, nVals, options, callback) => {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      if (!node._dht) {
        return callback(new Error('DHT is not available'))
      }

      node._dht.getMany(key, nVals, options, callback)
    }
  }
}
