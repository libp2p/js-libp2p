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

experiment('BASICS', function () {
  experiment('Swarm', function () {
    test('enforces instantiation with new', function (done) {
      expect(function () {
        Swarm()
      }).to.throw('Swarm must be called with new')
      done()
    })

    test('parses $IPFS_SWARM_PORT', function (done) {
      process.env.IPFS_SWARM_PORT = 1111
      var swarm = new Swarm()
      expect(swarm.port).to.be.equal(1111)
      process.env.IPFS_SWARM_PORT = undefined
      done()
    })
  })

  experiment('Swarm.listen', function (done) {
    test('handles missing port', function (done) {
      var swarm = new Swarm()
      swarm.listen(done)
    })

    test('handles passed in port', function (done) {
      var swarm = new Swarm()
      swarm.listen(1234)
      expect(swarm.port).to.be.equal(1234)
      done()
    })
  })

  experiment('Swarm.registerHandler', function () {
    test('throws when registering a protcol handler twice', function (done) {
      var swarm = new Swarm()
      swarm.registerHandler('/sparkles/1.1.1', function () {})
      swarm.registerHandler('/sparkles/1.1.1', function (err) {
        expect(err).to.be.an.instanceOf(Error)
        expect(err.message).to.be.equal('Handle for protocol already exists')
        done()
      })
    })
  })
})

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
  test('Check for lastSeen', function (done) {
    var protocol = '/sparkles/3.3.3'

    swarmB.registerHandler(protocol, function (stream) {})

    swarmA.openStream(peerB, protocol, function (err, stream) {
      expect(err).to.not.be.instanceof(Error)
      expect(peerB.lastSeen).to.be.instanceof(Date)
      done()
    })
  })

})

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
        done()
      })
      identifyA.on('peer-update', function (answer) {})
    }, 500)
  })

  test('Attach Identify, open a stream, reuse stream', function (done) {
    console.log('\n\n\n')

    var protocol = '/sparkles/3.3.3'

    var identifyA = new Identify(swarmA, peerA)
    var identifyB = new Identify(swarmB, peerB)

    swarmA.registerHandler(protocol, function (stream) {})
    swarmB.registerHandler(protocol, function (stream) {})

    swarmA.openStream(peerB, protocol, function (err, stream) {
      expect(err).to.not.be.instanceof(Error)
    })

    identifyB.on('peer-update', function (answer) {
      expect(Object.keys(swarmB.connections).length).to.equal(1)
      swarmB.openStream(peerA, protocol, function (err, stream) {
        expect(err).to.not.be.instanceof(Error)
        expect(Object.keys(swarmB.connections).length).to.equal(1)
        done()
      })
    })
    identifyA.on('peer-update', function (answer) {})
  })

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
