var Lab = require('lab')
var lab = exports.lab = Lab.script()

var experiment = lab.experiment
var test = lab.test
var before = lab.before

var Bootstrap = require('./../src')

before(function (done) {
  done()
})

experiment('Without verify on', function () {
  test('Find the other peer', { timeout: 1e3 * 10 }, function (done) {
    var bA = new Bootstrap(Bootstrap.default, {
      verify: false
    })

    bA.once('peer', function (peer) {
      done()
    })
  })
})
