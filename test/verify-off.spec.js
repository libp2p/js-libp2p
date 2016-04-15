/* eslint-env mocha */
'use strict'

var Bootstrap = require('./../src')

describe('Without verify on', function () {
  before(function (done) {
    done()
  })

  it('Find the other peer', function (done) {
    this.timeout(1e3 * 10)

    var bA = new Bootstrap(Bootstrap.default, {
      verify: false
    })

    bA.once('peer', function (peer) {
      done()
    })
  })
})
