/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const parallel = require('async/parallel')
const TCP = require('libp2p-tcp')
const multiplex = require('libp2p-multiplex')
const pull = require('pull-stream')
const secio = require('libp2p-secio')
const PeerBook = require('peer-book')

const utils = require('./utils')
const createInfos = utils.createInfos
const tryEcho = utils.tryEcho
const Switch = require('../src')

describe('SECIO', () => {
  let switchA
  let switchB
  let switchC

  before((done) => createInfos(3, (err, infos) => {
    expect(err).to.not.exist()

    const peerA = infos[0]
    const peerB = infos[1]
    const peerC = infos[2]

    peerA.multiaddrs.add('/ip4/127.0.0.1/tcp/9001')
    peerB.multiaddrs.add('/ip4/127.0.0.1/tcp/9002')
    peerC.multiaddrs.add('/ip4/127.0.0.1/tcp/9003')

    switchA = new Switch(peerA, new PeerBook())
    switchB = new Switch(peerB, new PeerBook())
    switchC = new Switch(peerC, new PeerBook())

    switchA.transport.add('tcp', new TCP())
    switchB.transport.add('tcp', new TCP())
    switchC.transport.add('tcp', new TCP())

    switchA.connection.crypto(secio.tag, secio.encrypt)
    switchB.connection.crypto(secio.tag, secio.encrypt)
    switchC.connection.crypto(secio.tag, secio.encrypt)

    switchA.connection.addStreamMuxer(multiplex)
    switchB.connection.addStreamMuxer(multiplex)
    switchC.connection.addStreamMuxer(multiplex)

    parallel([
      (cb) => switchA.transport.listen('tcp', {}, null, cb),
      (cb) => switchB.transport.listen('tcp', {}, null, cb),
      (cb) => switchC.transport.listen('tcp', {}, null, cb)
    ], done)
  }))

  after(function (done) {
    this.timeout(3 * 1000)
    parallel([
      (cb) => switchA.stop(cb),
      (cb) => switchB.stop(cb),
      (cb) => switchC.stop(cb)
    ], done)
  })

  it('handle + dial on protocol', (done) => {
    switchB.handle('/abacaxi/1.0.0', (protocol, conn) => pull(conn, conn))

    switchA.dial(switchB._peerInfo, '/abacaxi/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      expect(Object.keys(switchA.muxedConns).length).to.equal(1)
      tryEcho(conn, done)
    })
  })

  it('dial to warm conn', (done) => {
    switchB.dial(switchA._peerInfo, (err) => {
      expect(err).to.not.exist()
      expect(Object.keys(switchB.conns).length).to.equal(0)
      expect(Object.keys(switchB.muxedConns).length).to.equal(1)
      done()
    })
  })

  it('dial on protocol, reuse warmed conn', (done) => {
    switchA.handle('/papaia/1.0.0', (protocol, conn) => pull(conn, conn))

    switchB.dial(switchA._peerInfo, '/papaia/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      expect(Object.keys(switchB.conns).length).to.equal(0)
      expect(Object.keys(switchB.muxedConns).length).to.equal(1)
      tryEcho(conn, done)
    })
  })

  it('enable identify to reuse incomming muxed conn', (done) => {
    switchA.connection.reuse()
    switchC.connection.reuse()

    switchC.dial(switchA._peerInfo, (err) => {
      expect(err).to.not.exist()
      setTimeout(() => {
        expect(Object.keys(switchC.muxedConns).length).to.equal(1)
        expect(Object.keys(switchA.muxedConns).length).to.equal(2)
        done()
      }, 500)
    })
  })

  it('switch back to plaintext if no arguments passed in', () => {
    switchA.connection.crypto()
    expect(switchA.crypto.tag).to.eql('/plaintext/1.0.0')
  })
})
