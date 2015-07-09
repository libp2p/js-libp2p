var Lab = require('lab')
var Code = require('code')
var lab = exports.lab = Lab.script()

var experiment = lab.experiment
var test = lab.test
var beforeEach = lab.beforeEach
var afterEach = lab.afterEach
var expect = Code.expect

var multiaddr = require('multiaddr')
var Id = require('ipfs-peer-id')
var Peer = require('ipfs-peer')
var Swarm = require('../src/index.js')

var swarmA
var swarmB
var peerA
var peerB

beforeEach(function (done) {
  swarmA = new Swarm()
  swarmB = new Swarm()
  var c = new Counter(2, done)

  swarmA.listen(4000, function () {
    peerA = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/' + swarmA.port)])
    c.hit()
  })

  swarmB.listen(4001, function () {
    peerB = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/' + swarmB.port)])
    c.hit()
  })
})

afterEach(function (done) {
  var c = new Counter(2, done)
  swarmA.close(function () {
    c.hit()
  })
  swarmB.close(function () {
    c.hit()
  })
})

experiment('BASE', function () {
  test('Open a stream', {timeout: false}, function (done) {
    var protocol = '/sparkles/3.3.3'
    var c = new Counter(2, done)

    swarmB.registerHandle(protocol, function (stream) {
      c.hit()
    })

    swarmA.openStream(peerB, protocol, function (err, stream) {
      expect(err).to.not.be.instanceof(Error)
      c.hit()
    })
  })
})

experiment('IDENTIFY', function () {})

experiment('HARDNESS', function () {})

function Counter (target, callback) {
  var c = 0
  this.hit = count

  function count () {
    c += 1
    if (c === target) {
      callback()
    }
  }
}
