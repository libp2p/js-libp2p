/* eslint-env mocha */
'use strict'

const tape = require('tape')
const tests = require('interface-transport/tests')
const TCP = require('../src')

// Not adhering to this interface anymore!
describe.skip('interface-transport', () => {
  it('works', (done) => {
    const common = {
      setup (t, cb) {
        cb(null, new TCP())
      },
      teardown (t, cb) {
        cb()
      }
    }

    tape.onFinish(done)
    tests(tape, common)
  })
})
