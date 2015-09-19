var Lab = require('lab')
var Code = require('code')
var lab = exports.lab = Lab.script()

var experiment = lab.experiment
var test = lab.test
var before = lab.before
var expect = Code.expect

var multiaddr = require('multiaddr')
var Id = require('peer-id')
var Peer = require('peer-info')

var Sonar = require('./../src')

var pA
var pB

before(function (done) {
  pA = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/4001')])
  pB = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/4001')])
  done()
})

experiment('Without verify on', function () {
  test('Find the other peer', { timeout: 1e3 * 10 }, function (done) {
    var sA = new Sonar(pA, {
      verify: false,
      port: 9095
    })

    var sB = new Sonar(pB, {
      verify: false,
      port: 9095
    })

    sA.once('peer', function (peer) {
      expect(pB.id.toB58String()).to.equal(peer.id.toB58String())
      done()
    })

    sB.once('peer', function (peer) {})
  })
})
