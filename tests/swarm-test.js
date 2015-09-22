var Lab = require('lab')
var Code = require('code')
var lab = exports.lab = Lab.script()

var experiment = lab.experiment
var test = lab.test
var expect = Code.expect

var multiaddr = require('multiaddr')
var Id = require('peer-id')
var Peer = require('peer-info')
var Swarm = require('../src')
var tcp = require('libp2p-tcp')

/* TODO
experiment('Basics', function () {
  test('enforces creation with new', function (done) {done() })
})
*/

experiment('Without a Stream Muxer', function () {
  experiment('tcp', function () {
    test('add the transport', function (done) {
      var mh = multiaddr('/ip4/127.0.0.1/tcp/8010')
      var p = new Peer(Id.create(), [])
      var sw = new Swarm(p)

      sw.addTransport('tcp', tcp,
          { multiaddr: mh }, {}, {port: 8010}, function () {
        expect(sw.transports['tcp'].options).to.deep.equal({ multiaddr: mh })
        expect(sw.transports['tcp'].dialOptions).to.deep.equal({})
        expect(sw.transports['tcp'].listenOptions).to.deep.equal({port: 8010})
        expect(sw.transports['tcp'].transport).to.deep.equal(tcp)
        sw.closeListener('tcp', function () {
          done()
        })
      })
    })

    test('dial a conn', function (done) {
      var mh1 = multiaddr('/ip4/127.0.0.1/tcp/8010')
      var p1 = new Peer(Id.create(), [])
      var sw1 = new Swarm(p1)
      sw1.addTransport('tcp', tcp, { multiaddr: mh1 }, {}, {port: 8010}, ready)

      var mh2 = multiaddr('/ip4/127.0.0.1/tcp/8020')
      var p2 = new Peer(Id.create(), [])
      var sw2 = new Swarm(p2)
      sw2.addTransport('tcp', tcp, { multiaddr: mh2 }, {}, {port: 8020}, ready)

      var readyCounter = 0

      function ready () {
        readyCounter++
        if (readyCounter < 2) {
          return
        }

        sw1.dial(p2, {}, function (err) {
          expect(err).to.equal(undefined)
          expect(Object.keys(sw1.conns).length).to.equal(1)
          var cleaningCounter = 0
          sw1.closeConns(cleaningUp)
          sw2.closeConns(cleaningUp)

          sw1.closeListener('tcp', cleaningUp)
          sw2.closeListener('tcp', cleaningUp)

          function cleaningUp () {
            cleaningCounter++
            if (cleaningCounter < 4) {
              return
            }

            done()
          }
        })
      }
    })

    test('dial a conn on a protocol', function (done) {
      var mh1 = multiaddr('/ip4/127.0.0.1/tcp/8010')
      var p1 = new Peer(Id.create(), [])
      var sw1 = new Swarm(p1)
      sw1.addTransport('tcp', tcp, { multiaddr: mh1 }, {}, {port: 8010}, ready)

      var mh2 = multiaddr('/ip4/127.0.0.1/tcp/8020')
      var p2 = new Peer(Id.create(), [])
      var sw2 = new Swarm(p2)
      sw2.addTransport('tcp', tcp, { multiaddr: mh2 }, {}, {port: 8020}, ready)

      sw2.handleProtocol('/sparkles/1.0.0', function (conn) {
        conn.end()
        conn.on('end', function () {
          var cleaningCounter = 0
          sw1.closeConns(cleaningUp)
          sw2.closeConns(cleaningUp)

          sw1.closeListener('tcp', cleaningUp)
          sw2.closeListener('tcp', cleaningUp)

          function cleaningUp () {
            cleaningCounter++
            if (cleaningCounter < 4) {
              return
            }

            done()
          }
        })
      })

      var count = 0

      function ready () {
        count++
        if (count < 2) {
          return
        }

        sw1.dial(p2, {}, '/sparkles/1.0.0', function (err, conn) {
          expect(err).to.equal(null)
          expect(Object.keys(sw1.conns).length).to.equal(0)
          conn.end()
        })
      }
    })

    test('dial a protocol on a previous created conn', function (done) {
      var mh1 = multiaddr('/ip4/127.0.0.1/tcp/8010')
      var p1 = new Peer(Id.create(), [])
      var sw1 = new Swarm(p1)
      sw1.addTransport('tcp', tcp, { multiaddr: mh1 }, {}, {port: 8010}, ready)

      var mh2 = multiaddr('/ip4/127.0.0.1/tcp/8020')
      var p2 = new Peer(Id.create(), [])
      var sw2 = new Swarm(p2)
      sw2.addTransport('tcp', tcp, { multiaddr: mh2 }, {}, {port: 8020}, ready)

      var readyCounter = 0

      sw2.handleProtocol('/sparkles/1.0.0', function (conn) {
        conn.end()
        conn.on('end', function () {
          var cleaningCounter = 0
          sw1.closeConns(cleaningUp)
          sw2.closeConns(cleaningUp)

          sw1.closeListener('tcp', cleaningUp)
          sw2.closeListener('tcp', cleaningUp)

          function cleaningUp () {
            cleaningCounter++
            if (cleaningCounter < 4) {
              return
            }

            done()
          }
        })
      })

      function ready () {
        readyCounter++
        if (readyCounter < 2) {
          return
        }

        sw1.dial(p2, {}, function (err) {
          expect(err).to.equal(undefined)
          expect(Object.keys(sw1.conns).length).to.equal(1)

          sw1.dial(p2, {}, '/sparkles/1.0.0', function (err, conn) {
            expect(err).to.equal(null)
            expect(Object.keys(sw1.conns).length).to.equal(0)
            conn.end()
          })
        })
      }
    })

    test('add an upgrade', function (done) { done() })
    test('dial a conn on top of a upgrade', function (done) { done() })
    test('dial a conn on a protocol on top of a upgrade', function (done) { done() })
  })

  /* TODO
  experiment('udp', function () {
    test('add the transport', function (done) { done() })
    test('dial a conn', function (done) { done() })
    test('dial a conn on a protocol', function (done) { done() })
    test('add an upgrade', function (done) { done() })
    test('dial a conn on top of a upgrade', function (done) { done() })
    test('dial a conn on a protocol on top of a upgrade', function (done) { done() })
  }) */

  /* TODO
  experiment('udt', function () {
      test('add the transport', function (done) { done() })
      test('dial a conn', function (done) { done() })
      test('dial a conn on a protocol', function (done) { done() })
      test('add an upgrade', function (done) { done() })
      test('dial a conn on top of a upgrade', function (done) { done() })
      test('dial a conn on a protocol on top of a upgrade', function (done) { done() })
  }) */

  /* TODO
  experiment('utp', function () {
    test('add the transport', function (done) { done() })
    test('dial a conn', function (done) { done() })
    test('dial a conn on a protocol', function (done) { done() })
    test('add an upgrade', function (done) { done() })
    test('dial a conn on top of a upgrade', function (done) { done() })
    test('dial a conn on a protocol on top of a upgrade', function (done) { done() })
  }) */
})

experiment('With a SPDY Stream Muxer', function () {})

/* OLD
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

  experiment('Swarm.closeConns', function () {
    test('calls end on all connections', function (done) {
      swarmA.openConnection(peerB, function () {
        var key = Object.keys(swarmA.connections)[0]
        sinon.spy(swarmA.connections[key].conn, 'end')
        swarmA.closeConns(function () {
          expect(swarmA.connections[key].conn.end.called).to.be.equal(true)
          done()
        })
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

  test('Attach Identify, reuse peer', function (done) {
    var protocol = '/sparkles/3.3.3'

    var identifyA = new Identify(swarmA, peerA)
    var identifyB = new Identify(swarmB, peerB) // eslint-disable-line no-unused-vars

    swarmA.registerHandler(protocol, function (stream) {})
    swarmB.registerHandler(protocol, function (stream) {})

    var restartA = function (cb) {
      swarmA.openStream(peerB, protocol, function (err, stream) {
        expect(err).to.not.be.instanceof(Error)

        stream.end(cb)
      })
    }

    restartA(function () {
      identifyA.once('peer-update', function () {
        expect(peerA.previousObservedAddrs.length).to.be.equal(1)

        var c = new Counter(2, done)

        swarmA.closeConns(c.hit.bind(c))
        swarmB.closeConns(c.hit.bind(c))
      })
    })
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
*/

// function checkErr (err) {
//   console.log('err')
//  expect(err).to.be.instanceof(Error)
//  }
