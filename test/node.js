/* eslint-env mocha */
'use strict'

const os = require('os')
const path = require('path')
const rimraf = require('rimraf')
const async = require('async')
const FsStore = require('datastore-fs')

describe('node', () => {
  const store1 = path.join(os.tmpdir(), 'test-keystore-1')
  const store2 = path.join(os.tmpdir(), 'test-keystore-2')
  const datastore1 = new FsStore(store1)
  const datastore2 = new FsStore(store2)

  before((done) => {
    async.series([
      (cb) => datastore1.open(cb),
      (cb) => datastore2.open(cb)
    ], done)
  })

  after((done) => {
    async.series([
      (cb) => datastore1.close(cb),
      (cb) => datastore2.close(cb),
      (cb) => rimraf(store1, cb),
      (cb) => rimraf(store2, cb)
    ], done)
  })

  require('./keychain.spec')(datastore1, datastore2)
  require('./cms-interop')(datastore2)
  require('./peerid')
})
