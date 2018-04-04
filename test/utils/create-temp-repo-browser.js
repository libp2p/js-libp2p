/* global self */
'use strict'

const IPFSRepo = require('ipfs-repo')
const series = require('async/series')

const idb = self.indexedDB ||
  self.mozIndexedDB ||
  self.webkitIndexedDB ||
  self.msIndexedDB

function createTempRepo (callback) {
  const date = Date.now().toString()
  const path = `/bitswap-tests-${date}-${Math.random()}`

  const repo = new IPFSRepo(path)

  series([
    (cb) => repo.init({}, cb),
    (cb) => repo.open(cb)
  ], (err) => {
    if (err) {
      return callback(err)
    }
    repo.teardown = (callback) => {
      idb.deleteDatabase(path)
      idb.deleteDatabase(`${path}/blocks`)
      callback()
    }

    callback(null, repo)
  })
}

module.exports = createTempRepo
