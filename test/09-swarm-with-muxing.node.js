/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const parallel = require('run-parallel')
const multiaddr = require('multiaddr')
const Peer = require('peer-info')
const Swarm = require('../src')
const TCP = require('libp2p-tcp')
const WebSockets = require('libp2p-websockets')
const spdy = require('libp2p-spdy')

describe('high level API - with everything mixed all together!', function () {
  this.timeout(100000)

  var swarmA // tcp
  var peerA
  var swarmB // tcp+ws
  var peerB
  var swarmC // tcp+ws
  var peerC
  var swarmD // ws
  var peerD
  var swarmE // ws
  var peerE

  before((done) => {
    peerA = new Peer()
    peerB = new Peer()
    peerC = new Peer()
    peerD = new Peer()
    peerE = new Peer()

    // console.log('peer A', peerA.id.toB58String())
    // console.log('peer B', peerB.id.toB58String())
    // console.log('peer C', peerC.id.toB58String())

    swarmA = new Swarm(peerA)
    swarmB = new Swarm(peerB)
    swarmC = new Swarm(peerC)
    swarmD = new Swarm(peerD)
    swarmE = new Swarm(peerE)

    done()
  })

  after((done) => {
    parallel([
      (cb) => swarmA.close(cb),
      (cb) => swarmB.close(cb),
      // (cb) => swarmC.close(cb),
      (cb) => swarmD.close(cb),
      (cb) => swarmE.close(cb)
    ], done)
  })

  it('add tcp', (done) => {
    peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
    peerC.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/0'))

    swarmA.transport.add('tcp', new TCP())
    swarmB.transport.add('tcp', new TCP())
    swarmC.transport.add('tcp', new TCP())

    parallel([
      (cb) => swarmA.transport.listen('tcp', {}, null, cb),
      (cb) => swarmB.transport.listen('tcp', {}, null, cb)
      // (cb) => swarmC.transport.listen('tcp', {}, null, cb)
    ], done)
  })

  it.skip('add utp', (done) => {})

  it('add websockets', (done) => {
    peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9012/ws'))
    peerC.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9022/ws'))
    peerD.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9032/ws'))
    peerE.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9042/ws'))

    swarmB.transport.add('ws', new WebSockets())
    swarmC.transport.add('ws', new WebSockets())
    swarmD.transport.add('ws', new WebSockets())
    swarmE.transport.add('ws', new WebSockets())

    parallel([
      (cb) => swarmB.transport.listen('ws', {}, null, cb),
      // (cb) => swarmC.transport.listen('ws', {}, null, cb),
      (cb) => swarmD.transport.listen('ws', {}, null, cb),
      (cb) => swarmE.transport.listen('ws', {}, null, cb)
    ], done)
  })

  it('listen automatically', (done) => {
    swarmC.listen(done)
  })

  it('add spdy', () => {
    swarmA.connection.addStreamMuxer(spdy)
    swarmB.connection.addStreamMuxer(spdy)
    swarmC.connection.addStreamMuxer(spdy)
    swarmD.connection.addStreamMuxer(spdy)
    swarmE.connection.addStreamMuxer(spdy)

    swarmA.connection.reuse()
    swarmB.connection.reuse()
    swarmC.connection.reuse()
    swarmD.connection.reuse()
    swarmE.connection.reuse()
  })

  it.skip('add multiplex', () => {})

  it('warm up from A to B on tcp to tcp+ws', (done) => {
    parallel([
      (cb) => swarmB.once('peer-mux-established', (peerInfo) => {
        expect(peerInfo.id.toB58String()).to.equal(peerA.id.toB58String())
        cb()
      }),
      (cb) => swarmA.once('peer-mux-established', (peerInfo) => {
        expect(peerInfo.id.toB58String()).to.equal(peerB.id.toB58String())
        cb()
      }),
      (cb) => swarmA.dial(peerB, (err) => {
        expect(err).to.not.exist
        expect(Object.keys(swarmA.muxedConns).length).to.equal(1)
        cb()
      })
    ], done)
  })

  it('warm up a warmed up, from B to A', (done) => {
    swarmB.dial(peerA, (err) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmA.muxedConns).length).to.equal(1)
      done()
    })
  })

  it('dial from tcp to tcp+ws, on protocol', (done) => {
    swarmB.handle('/anona/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    swarmA.dial(peerB, '/anona/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmA.muxedConns).length).to.equal(1)
      conn.end()

      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
    })
  })

  it('dial from ws to ws no proto', (done) => {
    swarmD.dial(peerE, (err) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmD.muxedConns).length).to.equal(1)
      done()
    })
  })

  it('dial from ws to ws', (done) => {
    swarmE.handle('/abacaxi/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    swarmD.dial(peerE, '/abacaxi/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmD.muxedConns).length).to.equal(1)

      conn.end()
      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', () => {
        setTimeout(() => {
          expect(Object.keys(swarmE.muxedConns).length).to.equal(1)
          done()
        }, 1000)
      })
    })
  })

  it('dial from tcp to tcp+ws (returned conn)', (done) => {
    swarmB.handle('/grapes/1.0.0', (conn) => {
      conn.pipe(conn)
    })

    const conn = swarmA.dial(peerB, '/grapes/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmA.muxedConns).length).to.equal(1)
    })
    conn.end()

    conn.on('data', () => {}) // let it flow.. let it flooooow
    conn.on('end', done)
  })

  it('dial from tcp+ws to tcp+ws', (done) => {
    swarmC.handle('/mamao/1.0.0', (conn) => {
      expect(conn.peerId).to.exist
      conn.pipe(conn)
    })

    swarmA.dial(peerC, '/mamao/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(conn.peerId).to.exist
      expect(Object.keys(swarmA.muxedConns).length).to.equal(2)
      conn.end()

      conn.on('data', () => {}) // let it flow.. let it flooooow
      conn.on('end', done)
    })
  })

  it('hangUp', (done) => {
    let count = 0
    const ready = () => ++count === 3 ? done() : null

    swarmB.once('peer-mux-closed', (peerInfo) => {
      expect(Object.keys(swarmB.muxedConns).length).to.equal(0)
      ready()
    })

    swarmA.once('peer-mux-closed', (peerInfo) => {
      expect(Object.keys(swarmA.muxedConns).length).to.equal(1)
      ready()
    })

    swarmA.hangUp(peerB, (err) => {
      expect(err).to.not.exist
      ready()
    })
  })

  it('close a muxer emits event', (done) => {
    parallel([
      (cb) => swarmC.close(cb),
      (cb) => swarmA.once('peer-mux-closed', (peerInfo) => cb())
    ], done)
  })
})
