/* eslint-env mocha */
'use strict'

const tests = require('libp2p-interfaces/src/stream-muxer/tests')

const Mplex = require('../src')

describe('compliance', () => {
  tests({
    setup: () => Mplex,
    teardown () {}
  })
})
