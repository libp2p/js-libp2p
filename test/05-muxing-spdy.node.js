/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const parallel = require('async/parallel')
const multiaddr = require('multiaddr')
const Peer = require('peer-info')
const TCP = require('libp2p-tcp')
const WebSockets = require('libp2p-websockets')
const pull = require('pull-stream')
const spdy = require('libp2p-spdy')

const utils = require('./utils')
const Swarm = require('../src')

describe('stream muxing with spdy (on TCP)', () => {
  let swarmA
  let peerA
  let swarmB
  let peerB
  let swarmC
  let peerC
  let swarmD
  let peerD

  before((done) => {
    utils.createInfos(4, (err, infos) => {
      if (err) {
        return done(err)
      }

      peerA = infos[0]
      peerB = infos[1]
      peerC = infos[2]
      peerD = infos[3]

      // console.log('peer A', peerA.id.toB58String())
      // console.log('peer B', peerB.id.toB58String())
      // console.log('peer C', peerC.id.toB58String())

      peerA.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9001'))
      peerB.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9002'))
      peerC.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9003'))
      peerD.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9004'))

      swarmA = new Swarm(peerA)
      swarmB = new Swarm(peerB)
      swarmC = new Swarm(peerC)
      swarmD = new Swarm(peerD)

      swarmA.transport.add('tcp', new TCP())
      swarmB.transport.add('tcp', new TCP())
      swarmC.transport.add('tcp', new TCP())
      swarmD.transport.add('tcp', new TCP())

      parallel([
        (cb) => swarmA.transport.listen('tcp', {}, null, cb),
        (cb) => swarmB.transport.listen('tcp', {}, null, cb),
        (cb) => swarmC.transport.listen('tcp', {}, null, cb),
        (cb) => swarmD.transport.listen('tcp', {}, null, cb)
      ], done)
    })
  })

  after((done) => {
    parallel([
      (cb) => swarmA.close(cb),
      (cb) => swarmB.close(cb),
      // (cb) => swarmC.close(cb)
      (cb) => swarmD.close(cb)
    ], done)
  })

  it('add', () => {
    swarmA.connection.addStreamMuxer(spdy)
    swarmB.connection.addStreamMuxer(spdy)
    swarmC.connection.addStreamMuxer(spdy)
    swarmD.connection.addStreamMuxer(spdy)
  })

  it('handle + dial on protocol', (done) => {
    swarmB.handle('/abacaxi/1.0.0', (conn) => {
      pull(conn, conn)
    })

    swarmA.dial(peerB, '/abacaxi/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmA.muxedConns).length).to.equal(1)
      pull(pull.empty(), conn, pull.onEnd(done))
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
      pull(conn, conn)
    })

    swarmB.dial(peerA, '/papaia/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      expect(Object.keys(swarmB.conns).length).to.equal(0)
      expect(Object.keys(swarmB.muxedConns).length).to.equal(1)
      pull(pull.empty(), conn, pull.onEnd(done))
    })
  })

  it('enable identify to reuse incomming muxed conn', (done) => {
    swarmA.connection.reuse()
    swarmC.connection.reuse()

    swarmC.dial(peerA, (err) => {
      expect(err).to.not.exist
      setTimeout(() => {
        expect(Object.keys(swarmC.muxedConns).length).to.equal(1)
        expect(Object.keys(swarmA.muxedConns).length).to.equal(2)
        done()
      }, 500)
    })
  })

  it('with Identify, do getPeerInfo', (done) => {
    swarmA.handle('/banana/1.0.0', (conn) => {
      conn.getPeerInfo((err, peerInfoC) => {
        expect(err).to.not.exist
        expect(peerInfoC.id.toB58String()).to.equal(peerC.id.toB58String())
      })

      pull(conn, conn)
    })

    swarmC.dial(peerA, '/banana/1.0.0', (err, conn) => {
      expect(err).to.not.exist
      setTimeout(() => {
        expect(Object.keys(swarmC.muxedConns).length).to.equal(1)
        expect(Object.keys(swarmA.muxedConns).length).to.equal(2)
        conn.getPeerInfo((err, peerInfoA) => {
          expect(err).to.not.exist
          expect(peerInfoA.id.toB58String()).to.equal(peerA.id.toB58String())
          pull(pull.empty(), conn, pull.onEnd(done))
        })
      }, 500)
    })
  })

  // This test is not possible as the raw conn is not exposed anymore
  // TODO: create a similar version, but that spawns a swarm in a
  // different proc
  it.skip('make sure it does not blow up when the socket is closed', (done) => {
    swarmD.connection.reuse()

    let count = 0
    const destroyed = () => ++count === 2 ? done() : null

    swarmD.handle('/banana/1.0.0', (conn) => {
      pull(conn, pull.onEnd(destroyed))
    })

    swarmA.dial(peerD, '/banana/1.0.0', (err, conn) => {
      expect(err).to.not.exist

      pull(
        pull.empty(),
        swarmD.muxedConns[peerA.id.toB58String()].conn
      )
      pull(conn, pull.onEnd(destroyed))
    })
  })

  // This test is not possible as the raw conn is not exposed anymore
  // TODO: create a similar version, but that spawns a swarm in a
  // different proc
  it.skip('blow up a socket, with WebSockets', (done) => {
    let swarmE
    let peerE
    let swarmF
    let peerF

    peerE = new Peer()
    peerF = new Peer()

    peerE.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9110/ws'))
    peerF.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/9120/ws'))

    swarmE = new Swarm(peerE)
    swarmF = new Swarm(peerF)

    swarmE.transport.add('ws', new WebSockets())
    swarmF.transport.add('ws', new WebSockets())

    swarmE.connection.addStreamMuxer(spdy)
    swarmF.connection.addStreamMuxer(spdy)
    swarmE.connection.reuse()
    swarmF.connection.reuse()

    parallel([
      (cb) => swarmE.transport.listen('ws', {}, null, cb),
      (cb) => swarmF.transport.listen('ws', {}, null, cb)
    ], next)

    function next () {
      let count = 0
      const destroyed = () => ++count === 2 ? close() : null

      swarmE.handle('/avocado/1.0.0', (conn) => {
        pull(conn, pull.onEnd(destroyed))
      })

      swarmF.dial(peerE, '/avocado/1.0.0', (err, conn) => {
        expect(err).to.not.exist
        pull(conn, pull.onEnd(destroyed))
        pull(
          pull.empty(),
          swarmF.muxedConns[peerE.id.toB58String()].conn
        )
      })
    }

    function close () {
      parallel([
        (cb) => swarmE.close(cb),
        (cb) => swarmF.close(cb)
      ], done)
    }
  })

  it('close one end, make sure the other does not blow', (done) => {
    swarmC.close((err) => {
      if (err) throw err
      // to make sure it has time to propagate
      setTimeout(done, 1000)
    })
  })
})
