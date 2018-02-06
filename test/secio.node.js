/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const parallel = require('async/parallel')
const TCP = require('libp2p-tcp')
const multiplex = require('libp2p-spdy')
const pull = require('pull-stream')
const secio = require('libp2p-secio')
const PeerBook = require('peer-book')

const utils = require('./utils')
const Swarm = require('../src')

describe('secio conn upgrade (on TCP)', () => {
  let swarmA
  let peerA
  let swarmB
  let peerB
  let swarmC
  let peerC

  before((done) => {
    utils.createInfos(3, (err, infos) => {
      if (err) {
        return done(err)
      }

      peerA = infos[0]
      peerB = infos[1]
      peerC = infos[2]

      peerA.multiaddrs.add('/ip4/127.0.0.1/tcp/9001')
      peerB.multiaddrs.add('/ip4/127.0.0.1/tcp/9002')
      peerC.multiaddrs.add('/ip4/127.0.0.1/tcp/9003')

      swarmA = new Swarm(peerA, new PeerBook())
      swarmB = new Swarm(peerB, new PeerBook())
      swarmC = new Swarm(peerC, new PeerBook())

      swarmA.connection.crypto(secio.tag, secio.encrypt)
      swarmB.connection.crypto(secio.tag, secio.encrypt)
      swarmC.connection.crypto(secio.tag, secio.encrypt)

      swarmA.transport.add('tcp', new TCP())
      swarmB.transport.add('tcp', new TCP())
      swarmC.transport.add('tcp', new TCP())

      parallel([
        (cb) => swarmA.transport.listen('tcp', {}, null, cb),
        (cb) => swarmB.transport.listen('tcp', {}, null, cb),
        (cb) => swarmC.transport.listen('tcp', {}, null, cb)
      ], done)
    })
  })

  after(function (done) {
    this.timeout(3000)
    parallel([
      (cb) => swarmA.close(cb),
      (cb) => swarmB.close(cb),
      (cb) => swarmC.close(cb)
    ], done)
  })

  it('add', () => {
    swarmA.connection.addStreamMuxer(multiplex)
    swarmB.connection.addStreamMuxer(multiplex)
    swarmC.connection.addStreamMuxer(multiplex)
  })

  it('handle + dial on protocol', (done) => {
    swarmB.handle('/abacaxi/1.0.0', (protocol, conn) => pull(conn, conn))

    swarmA.dial(peerB, '/abacaxi/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      expect(Object.keys(swarmA.muxedConns).length).to.equal(1)
      pull(
        pull.empty(),
        conn,
        pull.onEnd(done)
      )
    })
  })

  it('dial to warm conn', (done) => {
    swarmB.dial(peerA, (err) => {
      expect(err).to.not.exist()
      expect(Object.keys(swarmB.conns).length).to.equal(0)
      expect(Object.keys(swarmB.muxedConns).length).to.equal(1)
      done()
    })
  })

  it('dial on protocol, reuse warmed conn', (done) => {
    swarmA.handle('/papaia/1.0.0', (protocol, conn) => pull(conn, conn))

    swarmB.dial(peerA, '/papaia/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      expect(Object.keys(swarmB.conns).length).to.equal(0)
      expect(Object.keys(swarmB.muxedConns).length).to.equal(1)
      pull(
        pull.empty(),
        conn,
        pull.onEnd(done)
      )
    })
  })

  it('enable identify to reuse incomming muxed conn', (done) => {
    swarmA.connection.reuse()
    swarmC.connection.reuse()

    swarmC.dial(peerA, (err) => {
      expect(err).to.not.exist()
      setTimeout(() => {
        expect(Object.keys(swarmC.muxedConns).length).to.equal(1)
        expect(Object.keys(swarmA.muxedConns).length).to.equal(2)
        done()
      }, 500)
    })
  })

  it('switch back to plaintext if no arguments passed in', () => {
    swarmA.connection.crypto()
    expect(swarmA.crypto.tag).to.eql('/plaintext/1.0.0')
  })
})
