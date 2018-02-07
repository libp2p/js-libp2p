'use strict'

module.exports = (node) => {
  return {
    findPeer: (id, callback) => {
      if (!node._dht) {
        return callback(new Error('DHT is not available'))
      }

      node._dht.findPeer(id, callback)
    }
  }
}
