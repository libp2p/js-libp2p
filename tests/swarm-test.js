/* eslint-env mocha */

const expect = require('chai').expect
// const async = require('async')

const multiaddr = require('multiaddr')
// const Id = require('peer-id')
const Peer = require('peer-info')
const Swarm = require('../src')
const TCP = require('libp2p-tcp')
const bl = require('bl')
// var SPDY = require('libp2p-spdy')

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

describe('transport - udt', () => {
  before((done) => { done() })

  it.skip('add', (done) => {})
  it.skip('listen', (done) => {})
  it.skip('dial', (done) => {})
  it.skip('close', (done) => {})
})

describe('transport - websockets', () => {
  before((done) => { done() })

  it.skip('add', (done) => {})
  it.skip('listen', (done) => {})
  it.skip('dial', (done) => {})
  it.skip('close', (done) => {})
})

describe('high level API - 1st stage, without stream multiplexing (on TCP)', () => {
  it.skip('handle a protocol', (done) => {})
  it.skip('dial on protocol', (done) => {})
  it.skip('dial to warm conn', (done) => {})
  it.skip('dial on protocol, reuse warmed conn', (done) => {})
  it.skip('close', (done) => {})
})

describe('stream muxing (on TCP)', () => {
  describe('multiplex', () => {
    before((done) => { done() })
    it.skip('add', (done) => {})
    it.skip('handle + dial on protocol', (done) => {})
    it.skip('dial to warm conn', (done) => {})
    it.skip('dial on protocol, reuse warmed conn', (done) => {})
    it.skip('enable identify to reuse incomming muxed conn', (done) => {})
    it.skip('close', (done) => {})
  })
  describe('spdy', () => {
    it.skip('add', (done) => {})
    it.skip('handle + dial on protocol', (done) => {})
    it.skip('dial to warm conn', (done) => {})
    it.skip('dial on protocol, reuse warmed conn', (done) => {})
    it.skip('enable identify to reuse incomming muxed conn', (done) => {})
    it.skip('close', (done) => {})
  })
})

describe('conn upgrades', () => {
  describe('secio on tcp', () => {
    before((done) => { done() })

    it.skip('add', (done) => {})
    it.skip('dial', (done) => {})
    it.skip('tls on a muxed stream (not the full conn)', (done) => {})
  })
  describe('tls on tcp', () => {
    before((done) => { done() })

    it.skip('add', (done) => {})
    it.skip('dial', (done) => {})
    it.skip('tls on a muxed stream (not the full conn)', (done) => {})
  })
})

describe('high level API = 2nd stage, with everything all together!', () => {
  before((done) => { done() })

  it.skip('add tcp', (done) => {})
  it.skip('add utp', (done) => {})
  it.skip('add websockets', (done) => {})
  it.skip('dial', (done) => {})
})
