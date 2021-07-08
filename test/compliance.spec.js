/* eslint-env mocha */
'use strict'

const tests = require('libp2p-interfaces-compliance-tests/src/stream-muxer')

const Mplex = require('../src')

describe('compliance', () => {
  tests({
    setup: () => Mplex,
    teardown () {}
  })
})
