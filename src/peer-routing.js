'use strict'

const tryEach = require('async/tryEach')
const errCode = require('err-code')
const promisify = require('promisify-es6')

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
     * @param {object} options
     * @param {number} options.maxTimeout How long the query should run
     * @param {function(Error, Result<Array>)} callback
     * @returns {void}
     */
    findPeer: promisify((id, options, callback) => {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      if (!routers.length) {
        callback(errCode(new Error('No peer routers available'), 'NO_ROUTERS_AVAILABLE'))
      }

      const tasks = routers.map((router) => {
        return (cb) => router.findPeer(id, options, (err, result) => {
          if (err) {
            return cb(err)
          }

          // If we don't have a result, we need to provide an error to keep trying
          if (!result || Object.keys(result).length === 0) {
            return cb(errCode(new Error('not found'), 'NOT_FOUND'), null)
          }

          cb(null, result)
        })
      })

      tryEach(tasks, (err, results) => {
        if (err) {
          return callback(err)
        }
        results = results || []
        callback(null, results)
      })
    })
  }
}
