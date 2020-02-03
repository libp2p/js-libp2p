/* eslint-env mocha */
'use strict'

const LevelStore = require('datastore-level')

describe('browser', () => {
  const datastore1 = new LevelStore('test-keystore-1', { db: require('level') })
  const datastore2 = new LevelStore('test-keystore-2', { db: require('level') })

  before(() => {
    return Promise.all([
      datastore1.open(),
      datastore2.open()
    ])
  })

  after(() => {
    return Promise.all([
      datastore1.close(),
      datastore2.close()
    ])
  })

  require('./keychain.spec')(datastore1, datastore2)
  require('./cms-interop')(datastore2)
  require('./peerid')
})
