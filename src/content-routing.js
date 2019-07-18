'use strict'

const tryEach = require('async/tryEach')
const parallel = require('async/parallel')
const errCode = require('err-code')
const promisify = require('promisify-es6')

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
     * @param {object} options
     * @param {number} options.maxTimeout How long the query should run
     * @param {number} options.maxNumProviders - maximum number of providers to find
     * @param {function(Error, Result<Array>)} callback
     * @returns {void}
     */
    findProviders: promisify((key, options, callback) => {
      if (typeof options === 'function') {
        callback = options
        options = {}
      } else if (typeof options === 'number') { // This can be deprecated in a future release
        options = {
          maxTimeout: options
        }
      }

      if (!routers.length) {
        return callback(errCode(new Error('No content routers available'), 'NO_ROUTERS_AVAILABLE'))
      }

      const tasks = routers.map((router) => {
        return (cb) => router.findProviders(key, options, (err, results) => {
          if (err) {
            return cb(err)
          }

          // If we don't have any results, we need to provide an error to keep trying
          if (!results || Object.keys(results).length === 0) {
            return cb(errCode(new Error('not found'), 'NOT_FOUND'), null)
          }

          cb(null, results)
        })
      })

      tryEach(tasks, (err, results) => {
        if (err && err.code !== 'NOT_FOUND') {
          return callback(err)
        }
        results = results || []
        callback(null, results)
      })
    }),

    /**
     * Iterates over all content routers in parallel to notify it is
     * a provider of the given key.
     *
     * @param {CID} key The CID key of the content to find
     * @param {function(Error)} callback
     * @returns {void}
     */
    provide: promisify((key, callback) => {
      if (!routers.length) {
        return callback(errCode(new Error('No content routers available'), 'NO_ROUTERS_AVAILABLE'))
      }

      parallel(routers.map((router) => {
        return (cb) => router.provide(key, cb)
      }), callback)
    })
  }
}
