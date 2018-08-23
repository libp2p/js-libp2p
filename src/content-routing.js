'use strict'

const tryEach = require('async/tryEach')
const parallel = require('async/parallel')

module.exports = (node) => {
  const routers = node._modules.contentRouting || []

  // If we have the dht, make it first
  if (node._dht) {
    routers.unshift(node._dht)
  }

  return {
    /**
     * Iterates over all content routers in series to find providers of the given key.
     * Once a content router succeeds, iteration will stop.
     *
     * @param {CID} key The CID key of the content to find
     * @param {number} timeout How long the query should run
     * @param {function(Error, Result<Array>)} callback
     * @returns {void}
     */
    findProviders: (key, timeout, callback) => {
      if (routers.length === 0) {
        return callback(new Error('No content routers available'))
      }

      const tasks = routers.map((router) => {
        return (cb) => router.findProviders(key, timeout, (err, results) => {
          if (err) {
            return cb(err)
          }

          // If we don't have any results, we need to provide an error to keep trying
          if (!results || Object.keys(results).length === 0) {
            return cb(true, null)
          }

          cb(null, results)
        })
      })

      tryEach(tasks, (err, results) => {
        if (err && err !== true) {
          return callback(err)
        }
        results = results || []
        callback(null, results)
      })
    },

    /**
     * Iterates over all content routers in parallel to notify it is
     * a provider of the given key.
     *
     * @param {CID} key The CID key of the content to find
     * @param {function(Error)} callback
     * @returns {void}
     */
    provide: (key, callback) => {
      if (routers.length === 0) {
        return callback(new Error('No content routers available'))
      }

      parallel(routers.map((router) => {
        return (cb) => router.provide(key, cb)
      }), callback)
    }
  }
}
