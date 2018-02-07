'use strict'

module.exports = (node) => {
  return {
    put: (key, value, callback) => {
      if (!node._dht) {
        return callback(new Error('DHT is not available'))
      }

      node._dht.put(key, value, callback)
    },
    get: (key, callback) => {
      if (!node._dht) {
        return callback(new Error('DHT is not available'))
      }

      node._dht.get(key, callback)
    },
    getMany (key, nVals, callback) {
      if (!node._dht) {
        return callback(new Error('DHT is not available'))
      }

      node._dht.getMany(key, nVals, callback)
    }
  }
}
