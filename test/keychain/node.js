/* eslint-env mocha */
'use strict'

const os = require('os')
const path = require('path')
const promisify = require('promisify-es6')
const rimraf = promisify(require('rimraf'))
const FsStore = require('datastore-fs')

describe('node', () => {
  const store1 = path.join(os.tmpdir(), 'test-keystore-1-' + Date.now())
  const store2 = path.join(os.tmpdir(), 'test-keystore-2-' + Date.now())
  const datastore1 = new FsStore(store1)
  const datastore2 = new FsStore(store2)

  before(async () => {
    await datastore1.open()
    await datastore2.open()
  })

  after(async () => {
    await datastore1.close()
    await datastore2.close()
    await rimraf(store1)
    await rimraf(store2)
  })

  require('./keychain.spec')(datastore1, datastore2)
  require('./cms-interop')(datastore2)
  require('./peerid')
})
