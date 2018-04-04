'use strict'

const IPFSRepo = require('ipfs-repo')
const pathJoin = require('path').join
const os = require('os')
const ncp = require('ncp')
const rimraf = require('rimraf')
const series = require('async/series')

const baseRepo = pathJoin(__dirname, '../fixtures/repo')

function createTempRepo (callback) {
  const date = Date.now().toString()
  const path = pathJoin(os.tmpdir(), `bitswap-tests-${date}-${Math.random()}`)

  ncp(baseRepo, path, (err) => {
    if (err) { return callback(err) }

    const repo = new IPFSRepo(path)

    repo.teardown = (done) => {
      series([
        (cb) => repo.close(cb),
        (cb) => rimraf(path, cb)
      ], (err) => done(err))
    }

    repo.open((err) => {
      if (err) { return callback(err) }
      callback(null, repo)
    })
  })
}

module.exports = createTempRepo
