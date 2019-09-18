/* eslint-env mocha */
'use strict'

const tests = require('interface-stream-muxer')
const Mplex = require('../src')

describe('compliance', () => {
  tests({
    setup: () => Mplex,
    teardown () {}
  })
})
