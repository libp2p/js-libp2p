/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const parallel = require('async/parallel')
const TCP = require('libp2p-tcp')
const multiplex = require('libp2p-mplex')
const spdy = require('libp2p-spdy')
const pull = require('pull-stream')
const PeerBook = require('peer-book')
const utils = require('./utils')
const createInfos = utils.createInfos
const tryEcho = utils.tryEcho

const Switch = require('../src')

describe('Stream Multiplexing', () => {
  [
    multiplex,
    spdy
  ].forEach((sm) => describe(sm.multicodec, () => {
    let switchA
    let switchB
    let switchC

    before((done) => createInfos(3, (err, peerInfos) => {
      expect(err).to.not.exist()
      function maGen (port) { return `/ip4/127.0.0.1/tcp/${port}` }

      const peerA = peerInfos[0]
      const peerB = peerInfos[1]
      const peerC = peerInfos[2]

      peerA.multiaddrs.add(maGen(9001))
      peerB.multiaddrs.add(maGen(9002))
      peerC.multiaddrs.add(maGen(9003))

      switchA = new Switch(peerA, new PeerBook())
      switchB = new Switch(peerB, new PeerBook())
      switchC = new Switch(peerC, new PeerBook())

      switchA.transport.add('tcp', new TCP())
      switchB.transport.add('tcp', new TCP())
      switchC.transport.add('tcp', new TCP())

      parallel([
        (cb) => switchA.transport.listen('tcp', {}, null, cb),
        (cb) => switchB.transport.listen('tcp', {}, null, cb),
        (cb) => switchC.transport.listen('tcp', {}, null, cb)
      ], done)
    }))

    after((done) => parallel([
      (cb) => switchA.stop(cb),
      (cb) => switchB.stop(cb)
    ], done))

    it('switch.connection.addStreamMuxer', (done) => {
      switchA.connection.addStreamMuxer(sm)
      switchB.connection.addStreamMuxer(sm)
      switchC.connection.addStreamMuxer(sm)
      done()
    })

    it('handle + dial on protocol', (done) => {
      switchB.handle('/abacaxi/1.0.0', (protocol, conn) => pull(conn, conn))

      switchA.dial(switchB._peerInfo, '/abacaxi/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        expect(switchA.connection.getAll()).to.have.length(1)

        tryEcho(conn, done)
      })
    })

    it('dial to warm conn', (done) => {
      switchB.dial(switchA._peerInfo, (err) => {
        expect(err).to.not.exist()

        expect(Object.keys(switchB.conns).length).to.equal(0)
        expect(switchB.connection.getAll()).to.have.length(1)
        done()
      })
    })

    it('dial on protocol, reuse warmed conn', (done) => {
      switchA.handle('/papaia/1.0.0', (protocol, conn) => pull(conn, conn))

      switchB.dial(switchA._peerInfo, '/papaia/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        expect(Object.keys(switchB.conns).length).to.equal(0)
        expect(switchB.connection.getAll()).to.have.length(1)

        tryEcho(conn, done)
      })
    })

    it('enable identify to reuse incomming muxed conn', (done) => {
      switchA.connection.reuse()
      switchC.connection.reuse()

      switchC.dial(switchA._peerInfo, (err) => {
        expect(err).to.not.exist()
        setTimeout(() => {
          expect(switchC.connection.getAll()).to.have.length(1)
          expect(switchA.connection.getAll()).to.have.length(2)
          done()
        }, 500)
      })
    })

    it('with Identify enabled, do getPeerInfo', (done) => {
      switchA.handle('/banana/1.0.0', (protocol, conn) => {
        conn.getPeerInfo((err, pi) => {
          expect(err).to.not.exist()
          expect(switchC._peerInfo.id.toB58String()).to.equal(pi.id.toB58String())
        })

        pull(conn, conn)
      })

      switchC.dial(switchA._peerInfo, '/banana/1.0.0', (err, conn) => {
        expect(err).to.not.exist()
        setTimeout(() => {
          expect(switchC.connection.getAll()).to.have.length(1)
          expect(switchA.connection.getAll()).to.have.length(2)

          conn.getPeerInfo((err, pi) => {
            expect(err).to.not.exist()
            expect(switchA._peerInfo.id.toB58String()).to.equal(pi.id.toB58String())
            tryEcho(conn, done)
          })
        }, 500)
      })
    })

    it('closing one side cleans out in the other', (done) => {
      switchC.stop((err) => {
        expect(err).to.not.exist()

        setTimeout(() => {
          expect(switchA.connection.getAll()).to.have.length(1)
          done()
        }, 500)
      })
    })
  }))
})
