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

experiment(': ', function () {
  var a
  var b
  var peerA
  var peerB

  beforeEach(function (done) {
    a = new Swarm()
    a.port = 4000
    a.listen()
    peerA = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/' + a.port)])

    b = new Swarm()
    b.port = 4001
    b.listen()
    peerB = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/' + b.port)])

    setTimeout(done, 1000)
  })

  afterEach(function (done) {
    // a.close()
    // b.close()
    done()
  })

  test('Open a stream', {timeout: false}, function (done) {
    var protocol = '/sparkles/3.3.3'
    var c = new Counter(2, done)

    b.registerHandle(protocol, function (stream) {
      console.log('bim')
      c.unamas()
    })

    a.openStream(peerB, protocol, function (err, stream) {
      console.log('pim')
      expect(err).to.not.be.instanceof(Error)
      c.unamas()
    })
  })

  function Counter (target, callback) {
    var c = 0

    this.unamas = count

    function count () {
      c += 1
      if (c === target) {
        callback()
      }
    }
  }

})
