'use strict'

const errCode = require('err-code')

const { messages, codes } = require('./errors')

module.exports = (node, DHT, config) => {
  const dht = new DHT({
    dialer: node.dialer,
    peerInfo: node.peerInfo,
    peerStore: node.peerStore,
    registrar: node.registrar,
    datastore: this.datastore,
    ...config
  })

  return {
    /**
     * Store the given key/value pair in the DHT.
     * @param {Buffer} key
     * @param {Buffer} value
     * @param {Object} [options] - put options
     * @param {number} [options.minPeers] - minimum number of peers required to successfully put
     * @returns {Promise<void>}
     */
    put: (key, value, options) => {
      if (!node.isStarted() || !dht.isStarted) {
        throw errCode(new Error(messages.NOT_STARTED_YET), codes.DHT_NOT_STARTED)
      }

      return dht.put(key, value, options)
    },

    /**
     * Get the value to the given key.
     * Times out after 1 minute by default.
     * @param {Buffer} key
     * @param {Object} [options] - get options
     * @param {number} [options.timeout] - optional timeout (default: 60000)
     * @returns {Promise<{from: PeerId, val: Buffer}>}
     */
    get: (key, options) => {
      if (!node.isStarted() || !dht.isStarted) {
        throw errCode(new Error(messages.NOT_STARTED_YET), codes.DHT_NOT_STARTED)
      }

      return dht.get(key, options)
    },

    /**
     * Get the `n` values to the given key without sorting.
     * @param {Buffer} key
     * @param {number} nVals
     * @param {Object} [options] - get options
     * @param {number} [options.timeout] - optional timeout (default: 60000)
     * @returns {Promise<Array<{from: PeerId, val: Buffer}>>}
     */
    getMany: (key, nVals, options) => {
      if (!node.isStarted() || !dht.isStarted) {
        throw errCode(new Error(messages.NOT_STARTED_YET), codes.DHT_NOT_STARTED)
      }

      return dht.getMany(key, nVals, options)
    },

    _dht: dht,

    start: () => dht.start(),

    stop: () => dht.stop()
  }
}
