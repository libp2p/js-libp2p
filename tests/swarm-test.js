/* eslint-env mocha */

const expect = require('chai').expect
// const async = require('async')

const multiaddr = require('multiaddr')
// const Id = require('peer-id')
const Peer = require('peer-info')
const Swarm = require('../src')
const TCP = require('libp2p-tcp')
const bl = require('bl')
const spdy = require('libp2p-spdy')

describe('basics', () => {
  it('throws on missing peerInfo', (done) => {
    expect(Swarm).to.throw(Error)
    done()
  })
})

describe('transport - tcp', function () {
  this.timeout(10000)

  var swarmA
  var swarmB
  var peerA = new Peer()
  var peerB = new Peer()

  before((done) => {
    peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9888'))
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9999'))
    swarmA = new Swarm(peerA)
    swarmB = new Swarm(peerB)
    done()
  })

  it('add', (done) => {
    swarmA.transport.add('tcp', new TCP())
    expect(Object.keys(swarmA.transports).length).to.equal(1)
    swarmB.transport.add('tcp', new TCP(), () => {
      expect(Object.keys(swarmB.transports).length).to.equal(1)
      done()
    })
  })

  it('listen', (done) => {
    var count = 0
    swarmA.transport.listen('tcp', {}, (conn) => {
      conn.pipe(conn)
    }, ready)
    swarmB.transport.listen('tcp', {}, (conn) => {
      conn.pipe(conn)
    }, ready)

    function ready () {
      if (++count === 2) {
        expect(peerA.multiaddrs.length).to.equal(1)
        expect(peerA.multiaddrs[0]).to.deep.equal(multiaddr('/ip4/127.0.0.1/tcp/9888'))
        expect(peerB.multiaddrs.length).to.equal(1)
        expect(peerB.multiaddrs[0]).to.deep.equal(multiaddr('/ip4/127.0.0.1/tcp/9999'))
        done()
      }
    }
  })

  it('dial to a multiaddr', (done) => {
    const conn = swarmA.transport.dial('tcp', multiaddr('/ip4/127.0.0.1/tcp/9999'), (err, conn) => {
      expect(err).to.not.exist
    })
    conn.pipe(bl((err, data) => {
      expect(err).to.not.exist
      done()
    }))
    conn.write('hey')
    conn.end()
  })

  it('dial to set of multiaddr, only one is available', (done) => {
    const conn = swarmA.transport.dial('tcp', [
      multiaddr('/ip4/127.0.0.1/tcp/9910'),
      multiaddr('/ip4/127.0.0.1/tcp/9999'),
      multiaddr('/ip4/127.0.0.1/tcp/9309')
    ], (err, conn) => {
      expect(err).to.not.exist
    })
    conn.pipe(bl((err, data) => {
      expect(err).to.not.exist
      done()
    }))
    conn.write('hey')
    conn.end()
  })

  it('close', (done) => {
    var count = 0
    swarmA.transport.close('tcp', closed)
    swarmB.transport.close('tcp', closed)

    function closed () {
      if (++count === 2) {
        done()
      }
    }
  })

  it('support port 0', (done) => {
    var swarm
    var peer = new Peer()
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
    swarm = new Swarm(peer)
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => {
      conn.pipe(conn)
    }, ready)

    function ready () {
      expect(peer.multiaddrs.length).to.equal(1)
      expect(peer.multiaddrs[0]).to.not.deep.equal(multiaddr('/ip4/127.0.0.1/tcp/0'))
      swarm.close(done)
    }
  })

  it('support addr /ip4/0.0.0.0/tcp/9050', (done) => {
    var swarm
    var peer = new Peer()
    peer.multiaddr.add(multiaddr('/ip4/0.0.0.0/tcp/9050'))
    swarm = new Swarm(peer)
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => {
      conn.pipe(conn)
    }, ready)

    function ready () {
      expect(peer.multiaddrs.length).to.equal(1)
      expect(peer.multiaddrs[0]).to.deep.equal(multiaddr('/ip4/0.0.0.0/tcp/9050'))
      swarm.close(done)
    }
  })

  it('support addr /ip4/0.0.0.0/tcp/0', (done) => {
    var swarm
    var peer = new Peer()
    peer.multiaddr.add(multiaddr('/ip4/0.0.0.0/tcp/0'))
    swarm = new Swarm(peer)
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => {
      conn.pipe(conn)
    }, ready)

    function ready () {
      expect(peer.multiaddrs.length).to.equal(1)
      expect(peer.multiaddrs[0]).to.not.deep.equal(multiaddr('/ip4/0.0.0.0/tcp/0'))
      swarm.close(done)
    }
  })

  it('listen in several addrs', (done) => {
    var swarm
    var peer = new Peer()
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9001'))
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9002'))
    peer.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9003'))
    swarm = new Swarm(peer)
    swarm.transport.add('tcp', new TCP())
    swarm.transport.listen('tcp', {}, (conn) => {
      conn.pipe(conn)
    }, ready)

    function ready () {
      expect(peer.multiaddrs.length).to.equal(3)
      swarm.close(done)
    }
  })
})

describe('transport - udt', function () {
  this.timeout(10000)

  before((done) => { done() })

  it.skip('add', (done) => {})
  it.skip('listen', (done) => {})
  it.skip('dial', (done) => {})
  it.skip('close', (done) => {})
})

describe('transport - websockets', function () {
  this.timeout(10000)

  before((done) => { done() })

  it.skip('add', (done) => {})
  it.skip('listen', (done) => {})
  it.skip('dial', (done) => {})
  it.skip('close', (done) => {})
})

describe('high level API - 1st without stream multiplexing (on TCP)', function () {
  this.timeout(20000)

  var swarmA
  var peerA
  var swarmB
  var peerB

  before((done) => {
    peerA = new Peer()
    peerB = new Peer()

    peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9001'))
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9002'))

    swarmA = new Swarm(peerA)
    swarmB = new Swarm(peerB)

    swarmA.transport.add('tcp', new TCP())
    swarmA.transport.listen('tcp', {}, null, ready)

    swarmB.transport.add('tcp', new TCP())
    swarmB.transport.listen('tcp', {}, null, ready)

    var counter = 0

    function ready () {
      if (++counter === 2) {
        done()
      }
    }
  })

  after((done) => {
    var counter = 0

    swarmA.close(closed)
    swarmB.close(closed)

    function closed () {
      if (++counter === 2) {
        done()
      }
    }
  })

  it('handle a protocol', (done) => {
    swarmB.handle('/bananas/1.0.0', (conn) => {
      conn.pipe(conn)
    })
    expect(Object.keys(swarmB.protocols).length).to.equal(1)
    done()
  })

  it('dial on protocol', (done) => {
    swarmB.handle('/pineapple/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    swarmA.dial(peerB, '/pineapple/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      conn.end()
      conn.on('end', done)
    })
  })

  it('dial to warm a conn', (done) => {
    swarmA.dial(peerB, (err) => {
      expect(err).to.not.exist
      done()
    })
  })

  it('dial on protocol, reuse warmed conn', (done) => {
    swarmA.dial(peerB, '/bananas/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      conn.end()
      conn.on('end', done)
    })
  })
})

describe('stream muxing (on TCP)', function () {
  this.timeout(20000)

  describe('multiplex', () => {
    before((done) => { done() })
    after((done) => { done() })

    it.skip('add', (done) => {})
    it.skip('handle + dial on protocol', (done) => {})
    it.skip('dial to warm conn', (done) => {})
    it.skip('dial on protocol, reuse warmed conn', (done) => {})
    it.skip('enable identify to reuse incomming muxed conn', (done) => {})
  })
  describe('spdy', () => {
    var swarmA
    var peerA
    var swarmB
    var peerB
    var swarmC
    var peerC

    before((done) => {
      peerA = new Peer()
      peerB = new Peer()
      peerC = new Peer()

      peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9001'))
      peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9002'))
      peerC.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9003'))

      swarmA = new Swarm(peerA)
      swarmB = new Swarm(peerB)
      swarmC = new Swarm(peerC)

      swarmA.transport.add('tcp', new TCP())
      swarmA.transport.listen('tcp', {}, null, ready)

      swarmB.transport.add('tcp', new TCP())
      swarmB.transport.listen('tcp', {}, null, ready)

      swarmC.transport.add('tcp', new TCP())
      swarmC.transport.listen('tcp', {}, null, ready)

      var counter = 0

      function ready () {
        if (++counter === 3) {
          done()
        }
      }
    })

    after((done) => {
      var counter = 0

      swarmA.close(closed)
      swarmB.close(closed)
      swarmC.close(closed)

      function closed () {
        if (++counter === 3) {
          done()
        }
      }
    })

    it('add', (done) => {
      swarmA.connection.addStreamMuxer(spdy)
      swarmB.connection.addStreamMuxer(spdy)
      swarmC.connection.addStreamMuxer(spdy)
      done()
    })

    it('handle + dial on protocol', (done) => {
      swarmB.handle('/abacaxi/1.0.0', (conn) => {
        conn.pipe(conn)
      })

      swarmA.dial(peerB, '/abacaxi/1.0.0', (err, conn) => {
        expect(err).to.not.exist
        expect(Object.keys(swarmA.muxedConns).length).to.equal(1)
        conn.end()
        conn.on('end', done)
      })
    })

    it('dial to warm conn', (done) => {
      swarmB.dial(peerA, (err) => {
        expect(err).to.not.exist
        expect(Object.keys(swarmB.conns).length).to.equal(0)
        expect(Object.keys(swarmB.muxedConns).length).to.equal(1)
        done()
      })
    })

    it('dial on protocol, reuse warmed conn', (done) => {
      swarmA.handle('/papaia/1.0.0', (conn) => {
        conn.pipe(conn)
      })

      swarmB.dial(peerA, '/papaia/1.0.0', (err, conn) => {
        expect(err).to.not.exist
        expect(Object.keys(swarmB.conns).length).to.equal(0)
        expect(Object.keys(swarmB.muxedConns).length).to.equal(1)
        conn.end()
        conn.on('end', done)
      })
    })

    it.skip('enable identify to reuse incomming muxed conn', (done) => {
      swarmA.connection.reuse()
      swarmC.connection.reuse()

      swarmC.dial(peerA, (err) => {
        expect(err).to.not.exist
        setTimeout(() => {
          expect(Object.keys(swarmC.muxedConns).length).to.equal(1)
          expect(Object.keys(swarmA.muxedConns).length).to.equal(2)
        }, 100)
      })
    })
  })
})

/*
describe('conn upgrades', function () {
  this.timeout(20000)

  describe('secio on tcp', () => {
    // before((done) => { done() })
    // after((done) => { done() })

    it.skip('add', (done) => {})
    it.skip('dial', (done) => {})
    it.skip('tls on a muxed stream (not the full conn)', (done) => {})
  })
  describe('tls on tcp', () => {
    // before((done) => { done() })
    // after((done) => { done() })

    it.skip('add', (done) => {})
    it.skip('dial', (done) => {})
    it.skip('tls on a muxed stream (not the full conn)', (done) => {})
  })
})

describe('high level API - with everything mixed all together!', function () {
  this.timeout(20000)

  // before((done) => { done() })
  // after((done) => { done() })

  it.skip('add tcp', (done) => {})
  it.skip('add utp', (done) => {})
  it.skip('add websockets', (done) => {})
  it.skip('dial', (done) => {})
})
*/
