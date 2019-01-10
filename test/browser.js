/* eslint-env mocha */
'use strict'

const series = require('async/series')
const LevelStore = require('datastore-level')

describe('browser', () => {
  const datastore1 = new LevelStore('test-keystore-1', { db: require('level-js') })
  const datastore2 = new LevelStore('test-keystore-2', { db: require('level-js') })

  before((done) => {
    series([
      (cb) => datastore1.open(cb),
      (cb) => datastore2.open(cb)
    ], done)
  })

  after((done) => {
    series([
      (cb) => datastore1.close(cb),
      (cb) => datastore2.close(cb)
    ], done)
  })

  require('./keychain.spec')(datastore1, datastore2)
  require('./cms-interop')(datastore2)
  require('./peerid')
})
