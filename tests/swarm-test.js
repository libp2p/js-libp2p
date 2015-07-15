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
var Swarm = require('../src/')
var Identify = require('../src/identify')

var swarmA
var swarmB
var peerA
var peerB

beforeEach(function (done) {
  swarmA = new Swarm()
  swarmB = new Swarm()
  var c = new Counter(2, done)

  swarmA.listen(8100, function () {
    peerA = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/' + swarmA.port)])
    c.hit()
  })

  swarmB.listen(8101, function () {
    peerB = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/' + swarmB.port)])
    c.hit()
  })

})

afterEach(function (done) {
  swarmA.closeListener()
  swarmB.closeListener()
  done()
})
/*
experiment('BASE', function () {
  test('Open a stream', function (done) {
    var protocol = '/sparkles/3.3.3'
    var c = new Counter(2, done)

    swarmB.registerHandler(protocol, function (stream) {
      c.hit()
    })

    swarmA.openStream(peerB, protocol, function (err, stream) {
      expect(err).to.not.be.instanceof(Error)
      c.hit()
    })
  })

  test('Reuse connection (from dialer)', function (done) {
    var protocol = '/sparkles/3.3.3'

    swarmB.registerHandler(protocol, function (stream) {})

    swarmA.openStream(peerB, protocol, function (err, stream) {
      expect(err).to.not.be.instanceof(Error)

      swarmA.openStream(peerB, protocol, function (err, stream) {
        expect(err).to.not.be.instanceof(Error)
        expect(swarmA.connections.length === 1)
        done()
      })
    })
  })
})
*/
experiment('IDENTIFY', function () {
  test('Attach Identify, open a stream, see a peer update', function (done) {

    swarmA.on('error', function (err) {
      console.log('A - ', err)
    })

    swarmB.on('error', function (err) {
      console.log('B - ', err)
    })

    var protocol = '/sparkles/3.3.3'

    var identifyA = new Identify(swarmA, peerA)
    var identifyB = new Identify(swarmB, peerB)
    setTimeout(function () {
      swarmB.registerHandler(protocol, function (stream) {})

      swarmA.openStream(peerB, protocol, function (err, stream) {
        expect(err).to.not.be.instanceof(Error)
      })

      identifyB.on('peer-update', function (answer) {
        console.log('SUCH PEER-UPDATE')
        done()
      })
      identifyA.on('peer-update', function (answer) {})
    }, 500)
  })
  /*
  test('Attach Identify, open a stream, reuse stream', function (done) {
    var protocol = '/sparkles/3.3.3'

    var identifyA = new Identify(swarmA, peerA)
    var identifyB = new Identify(swarmB, peerB)

    swarmA.registerHandler(protocol, function (stream) {})
    swarmB.registerHandler(protocol, function (stream) {})

    swarmA.openStream(peerB, protocol, function theOTHER (err, stream) {
      expect(err).to.not.be.instanceof(Error)
    })

    identifyB.on('peer-update', function (answer) {
      expect(Object.keys(swarmB.connections).length).to.equal(1)
      swarmB.openStream(peerA, protocol, function theCALLBACK (err, stream) {
        expect(err).to.not.be.instanceof(Error)
        expect(Object.keys(swarmB.connections).length).to.equal(1)
        done()
      })
    })
    identifyA.on('peer-update', function (answer) {})
  })
  */
})

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

// function checkErr (err) {
//   console.log('err')
//  expect(err).to.be.instanceof(Error)
//  }
