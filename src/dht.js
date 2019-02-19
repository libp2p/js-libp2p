'use strict'

const nextTick = require('async/nextTick')
const errCode = require('err-code')

const { messages, codes } = require('./errors')

module.exports = (node) => {
  return {
    put: (key, value, callback) => {
      if (!node._dht) {
        return nextTick(callback, errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED))
      }

      node._dht.put(key, value, callback)
    },
    get: (key, options, callback) => {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      if (!node._dht) {
        return nextTick(callback, errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED))
      }

      node._dht.get(key, options, callback)
    },
    getMany: (key, nVals, options, callback) => {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      if (!node._dht) {
        return nextTick(callback, errCode(new Error(messages.DHT_DISABLED), codes.DHT_DISABLED))
      }

      node._dht.getMany(key, nVals, options, callback)
    }
  }
}
