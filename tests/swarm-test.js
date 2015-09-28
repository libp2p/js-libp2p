var Lab = require('lab')
var Code = require('code')
var lab = exports.lab = Lab.script()
var async = require('async')

var experiment = lab.experiment
var test = lab.test
var beforeEach = lab.beforeEach
var afterEach = lab.afterEach
var expect = Code.expect

var multiaddr = require('multiaddr')
var Id = require('peer-id')
var Peer = require('peer-info')
var Swarm = require('../src')
var tcp = require('libp2p-tcp')
var Spdy = require('libp2p-spdy')

// because of Travis-CI
process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err)
})

experiment('Basics', function () {
  test('enforces creation with new', function (done) {
    expect(function () {
      Swarm()
    }).to.throw()
    done()
  })

  test('it throws an exception without peerSelf', function (done) {
    expect(function () {
      var sw = new Swarm()
      sw.close()
    }).to.throw(Error)
    done()
  })
})

experiment('When dialing', function () {
  experiment('if the swarm does add any of the peer transports', function () {
    test('it returns an error', function (done) {
      var peerOne = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/8090')])
      var peerTwo = new Peer(Id.create(), [multiaddr('/ip4/127.0.0.1/tcp/8091')])
      var swarm = new Swarm(peerOne)

      swarm.dial(peerTwo, {}, function (err) {
        expect(err).to.exist()
        done()
      })
    })
  })
})

experiment('Without a Stream Muxer', function () {
  experiment('and one swarm over tcp', function () {
    test('add the transport', function (done) {
      var mh = multiaddr('/ip4/127.0.0.1/tcp/8010')
      var p = new Peer(Id.create(), [])
      var sw = new Swarm(p)

      sw.addTransport('tcp', tcp, { multiaddr: mh }, {}, {port: 8010}, ready)

      function ready () {
        expect(sw.transports['tcp'].options).to.deep.equal({})
        expect(sw.transports['tcp'].dialOptions).to.deep.equal({})
        expect(sw.transports['tcp'].listenOptions).to.deep.equal({port: 8010})
        expect(sw.transports['tcp'].transport).to.deep.equal(tcp)

        sw.close(done)
      }
    })
  })

  experiment('and two swarms over tcp', function () {
    var mh1, p1, sw1, mh2, p2, sw2

    beforeEach(function (done) {
      mh1 = multiaddr('/ip4/127.0.0.1/tcp/8010')
      p1 = new Peer(Id.create(), [])
      sw1 = new Swarm(p1)

      mh2 = multiaddr('/ip4/127.0.0.1/tcp/8020')
      p2 = new Peer(Id.create(), [])
      sw2 = new Swarm(p2)

      async.parallel([
        function (cb) {
          sw1.addTransport('tcp', tcp, { multiaddr: mh1 }, {}, {port: 8010}, cb)
        },
        function (cb) {
          sw2.addTransport('tcp', tcp, { multiaddr: mh2 }, {}, {port: 8020}, cb)
        }
      ], done)
    })

    afterEach(function (done) {
      async.parallel([sw1.close, sw2.close], done)
    })

    test('dial a conn', function (done) {
      sw1.dial(p2, {}, function (err) {
        expect(err).to.equal(undefined)
        expect(Object.keys(sw1.conns).length).to.equal(1)
        done()
      })
    })

    test('dial a conn on a protocol', function (done) {
      sw2.handleProtocol('/sparkles/1.0.0', function (conn) {
        conn.end()
        conn.on('end', done)
      })

      sw1.dial(p2, {}, '/sparkles/1.0.0', function (err, conn) {
        expect(err).to.equal(null)
        expect(Object.keys(sw1.conns).length).to.equal(0)
        conn.end()
      })
    })

    test('dial a protocol on a previous created conn', function (done) {
      sw2.handleProtocol('/sparkles/1.0.0', function (conn) {
        conn.end()
        conn.on('end', done)
      })

      sw1.dial(p2, {}, function (err) {
        expect(err).to.equal(undefined)
        expect(Object.keys(sw1.conns).length).to.equal(1)

        sw1.dial(p2, {}, '/sparkles/1.0.0', function (err, conn) {
          expect(err).to.equal(null)
          expect(Object.keys(sw1.conns).length).to.equal(0)

          conn.end()
        })
      })
    })

  // test('add an upgrade', function (done) { done() })
  // test('dial a conn on top of a upgrade', function (done) { done() })
  // test('dial a conn on a protocol on top of a upgrade', function (done) { done() })
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

experiment('With a SPDY Stream Muxer', function () {
  experiment('and one swarm over tcp', function () {
    // TODO: What is the test here?
    test('add Stream Muxer', function (done) {
      // var mh = multiaddr('/ip4/127.0.0.1/tcp/8010')
      var p = new Peer(Id.create(), [])
      var sw = new Swarm(p)
      sw.addStreamMuxer('spdy', Spdy, {})

      done()
    })
  })

  experiment('and two swarms over tcp', function () {
    var mh1, p1, sw1, mh2, p2, sw2

    beforeEach(function (done) {
      mh1 = multiaddr('/ip4/127.0.0.1/tcp/8010')
      p1 = new Peer(Id.create(), [])
      sw1 = new Swarm(p1)
      sw1.addStreamMuxer('spdy', Spdy, {})

      mh2 = multiaddr('/ip4/127.0.0.1/tcp/8020')
      p2 = new Peer(Id.create(), [])
      sw2 = new Swarm(p2)
      sw2.addStreamMuxer('spdy', Spdy, {})

      async.parallel([
        function (cb) {
          sw1.addTransport('tcp', tcp, { multiaddr: mh1 }, {}, {port: 8010}, cb)
        },
        function (cb) {
          sw2.addTransport('tcp', tcp, { multiaddr: mh2 }, {}, {port: 8020}, cb)
        }
      ], done)
    })

    function afterEach (done) {
      var cleaningCounter = 0
      sw1.closeConns(cleaningUp)
      sw2.closeConns(cleaningUp)

      sw1.closeListener('tcp', cleaningUp)
      sw2.closeListener('tcp', cleaningUp)

      function cleaningUp () {
        cleaningCounter++
        // TODO FIX: here should be 4, but because super wrapping of
        // streams, it makes it so hard to properly close the muxed
        // streams - https://github.com/indutny/spdy-transport/issues/14
        if (cleaningCounter < 3) {
          return
        }

        done()
      }
    }

    test('dial a conn on a protocol', function (done) {
      sw2.handleProtocol('/sparkles/1.0.0', function (conn) {
        // formallity so that the conn starts flowing
        conn.on('data', function (chunk) {})

        conn.end()
        conn.on('end', function () {
          expect(Object.keys(sw1.muxedConns).length).to.equal(1)
          expect(Object.keys(sw2.muxedConns).length).to.equal(0)
          afterEach(done)
        })
      })

      sw1.dial(p2, {}, '/sparkles/1.0.0', function (err, conn) {
        conn.on('data', function () {})
        expect(err).to.equal(null)
        expect(Object.keys(sw1.conns).length).to.equal(0)
        conn.end()
      })
    })

    test('dial two conns (transport reuse)', function (done) {
      sw2.handleProtocol('/sparkles/1.0.0', function (conn) {
        // formality so that the conn starts flowing
        conn.on('data', function (chunk) {})

        conn.end()
        conn.on('end', function () {
          expect(Object.keys(sw1.muxedConns).length).to.equal(1)
          expect(Object.keys(sw2.muxedConns).length).to.equal(0)

          afterEach(done)
        })
      })

      sw1.dial(p2, {}, '/sparkles/1.0.0', function (err, conn) {
        // TODO Improve clarity
        sw1.dial(p2, {}, '/sparkles/1.0.0', function (err, conn) {
          conn.on('data', function () {})
          expect(err).to.equal(null)
          expect(Object.keys(sw1.conns).length).to.equal(0)

          conn.end()
        })

        conn.on('data', function () {})
        expect(err).to.equal(null)
        expect(Object.keys(sw1.conns).length).to.equal(0)

        conn.end()
      })
    })
  })

  experiment('and two identity enabled swarms over tcp', function () {
    var mh1, p1, sw1, mh2, p2, sw2

    beforeEach(function (done) {
      mh1 = multiaddr('/ip4/127.0.0.1/tcp/8010')
      p1 = new Peer(Id.create(), [])
      sw1 = new Swarm(p1)
      sw1.addStreamMuxer('spdy', Spdy, {})
      sw1.enableIdentify()

      mh2 = multiaddr('/ip4/127.0.0.1/tcp/8020')
      p2 = new Peer(Id.create(), [])
      sw2 = new Swarm(p2)
      sw2.addStreamMuxer('spdy', Spdy, {})
      sw2.enableIdentify()

      async.parallel([
        function (cb) {
          sw1.addTransport('tcp', tcp, { multiaddr: mh1 }, {}, {port: 8010}, cb)
        },
        function (cb) {
          sw2.addTransport('tcp', tcp, { multiaddr: mh2 }, {}, {port: 8020}, cb)
        }
      ], done)
    })

    afterEach(function (done) {
      var cleaningCounter = 0
      sw1.closeConns(cleaningUp)
      sw2.closeConns(cleaningUp)

      sw1.closeListener('tcp', cleaningUp)
      sw2.closeListener('tcp', cleaningUp)

      function cleaningUp () {
        cleaningCounter++
        // TODO FIX: here should be 4, but because super wrapping of
        // streams, it makes it so hard to properly close the muxed
        // streams - https://github.com/indutny/spdy-transport/issues/14
        if (cleaningCounter < 3) {
          return
        }
        // give time for identify to finish
        setTimeout(function () {
          expect(Object.keys(sw2.muxedConns).length).to.equal(1)
          done()
        }, 500)
      }
    })

    test('identify', function (done) {
      sw2.handleProtocol('/sparkles/1.0.0', function (conn) {
        // formallity so that the conn starts flowing
        conn.on('data', function (chunk) {})

        conn.end()
        conn.on('end', function () {
          expect(Object.keys(sw1.muxedConns).length).to.equal(1)
          done()
        })
      })

      sw1.dial(p2, {}, '/sparkles/1.0.0', function (err, conn) {
        conn.on('data', function () {})
        expect(err).to.equal(null)
        expect(Object.keys(sw1.conns).length).to.equal(0)
        conn.end()
      })
    })
  })
})
