'use strict'

const tryEach = require('async/tryEach')

module.exports = (node) => {
  const routers = node._modules.peerRouting || []

  // If we have the dht, make it first
  if (node._dht) {
    routers.unshift(node._dht)
  }

  return {
    /**
     * Iterates over all peer routers in series to find the given peer.
     *
     * @param {String} id The id of the peer to find
     * @param {number} timeout How long the query should run
     * @param {function(Error, Result<Array>)} callback
     * @returns {void}
     */
    findPeer: (id, timeout, callback) => {
      if (routers.length === 0) {
        return callback(new Error('No peer routers available'))
      }

      if (typeof timeout === 'function') {
        callback = timeout
        timeout = null
      }

      const tasks = routers.map((router) => {
        return (cb) => router.findPeer(id, timeout, (err, result) => {
          if (err) {
            return cb(err)
          }

          // If we don't have a result, we need to provide an error to keep trying
          if (!result || Object.keys(result).length === 0) {
            return cb(Object.assign(new Error('not found'), {
              code: 'NOT_FOUND'
            }), null)
          }

          cb(null, result)
        })
      })

      tryEach(tasks, (err, results) => {
        if (err && err.code !== 'NOT_FOUND') {
          return callback(err)
        }
        results = results || null
        callback(null, results)
      })
    }
  }
}
