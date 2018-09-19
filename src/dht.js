'use strict'

module.exports = (node) => {
  return {
    put: (key, value, callback) => {
      if (!node._dht) {
        return callback(new Error('DHT is not available'))
      }

      node._dht.put(key, value, callback)
    },
    get: (key, maxTimeout, callback) => {
      if (typeof maxTimeout === 'function') {
        callback = maxTimeout
        maxTimeout = null
      }

      if (!node._dht) {
        return callback(new Error('DHT is not available'))
      }

      node._dht.get(key, maxTimeout, callback)
    },
    getMany: (key, nVals, maxTimeout, callback) => {
      if (typeof maxTimeout === 'function') {
        callback = maxTimeout
        maxTimeout = null
      }

      if (!node._dht) {
        return callback(new Error('DHT is not available'))
      }

      node._dht.getMany(key, nVals, maxTimeout, callback)
    }
  }
}
