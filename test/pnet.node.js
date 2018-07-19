/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const parallel = require('async/parallel')
const TCP = require('libp2p-tcp')
const multiplex = require('libp2p-mplex')
const pull = require('pull-stream')
const PeerBook = require('peer-book')
const secio = require('libp2p-secio')
const Protector = require('libp2p-pnet')

const utils = require('./utils')
const createInfos = utils.createInfos
const tryEcho = utils.tryEcho
const Switch = require('../src')

const generatePSK = Protector.generate

const psk = Buffer.alloc(95)
const psk2 = Buffer.alloc(95)
generatePSK(psk)
generatePSK(psk2)

describe('Private Network', function () {
  this.timeout(20 * 1000)

  let switchA
  let switchB
  let switchC
  let switchD

  before((done) => createInfos(4, (err, infos) => {
    expect(err).to.not.exist()

    const peerA = infos[0]
    const peerB = infos[1]
    const peerC = infos[2]
    const peerD = infos[3]

    peerA.multiaddrs.add('/ip4/127.0.0.1/tcp/9001')
    peerB.multiaddrs.add('/ip4/127.0.0.1/tcp/9002')
    peerC.multiaddrs.add('/ip4/127.0.0.1/tcp/9003')
    peerD.multiaddrs.add('/ip4/127.0.0.1/tcp/9004')

    switchA = new Switch(peerA, new PeerBook(), {
      protector: new Protector(psk)
    })
    switchB = new Switch(peerB, new PeerBook(), {
      protector: new Protector(psk)
    })
    // alternative way to add the protector
    switchC = new Switch(peerC, new PeerBook())
    switchC.protector = new Protector(psk)
    // Create a switch on a different private network
    switchD = new Switch(peerD, new PeerBook(), {
      protector: new Protector(psk2)
    })

    switchA.transport.add('tcp', new TCP())
    switchB.transport.add('tcp', new TCP())
    switchC.transport.add('tcp', new TCP())
    switchD.transport.add('tcp', new TCP())

    switchA.connection.crypto(secio.tag, secio.encrypt)
    switchB.connection.crypto(secio.tag, secio.encrypt)
    switchC.connection.crypto(secio.tag, secio.encrypt)
    switchD.connection.crypto(secio.tag, secio.encrypt)

    switchA.connection.addStreamMuxer(multiplex)
    switchB.connection.addStreamMuxer(multiplex)
    switchC.connection.addStreamMuxer(multiplex)
    switchD.connection.addStreamMuxer(multiplex)

    parallel([
      (cb) => switchA.transport.listen('tcp', {}, null, cb),
      (cb) => switchB.transport.listen('tcp', {}, null, cb),
      (cb) => switchC.transport.listen('tcp', {}, null, cb),
      (cb) => switchD.transport.listen('tcp', {}, null, cb)
    ], done)
  }))

  after(function (done) {
    this.timeout(3 * 1000)
    parallel([
      (cb) => switchA.stop(cb),
      (cb) => switchB.stop(cb),
      (cb) => switchC.stop(cb),
      (cb) => switchD.stop(cb)
    ], done)
  })

  it('should handle + dial on protocol', (done) => {
    switchB.handle('/abacaxi/1.0.0', (protocol, conn) => pull(conn, conn))

    switchA.dial(switchB._peerInfo, '/abacaxi/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      expect(Object.keys(switchA.muxedConns).length).to.equal(1)
      tryEcho(conn, done)
    })
  })

  it('should dial to warm conn', (done) => {
    switchB.dial(switchA._peerInfo, (err) => {
      expect(err).to.not.exist()
      expect(Object.keys(switchB.conns).length).to.equal(0)
      expect(Object.keys(switchB.muxedConns).length).to.equal(1)
      done()
    })
  })

  it('should dial on protocol, reuseing warmed conn', (done) => {
    switchA.handle('/papaia/1.0.0', (protocol, conn) => pull(conn, conn))

    switchB.dial(switchA._peerInfo, '/papaia/1.0.0', (err, conn) => {
      expect(err).to.not.exist()
      expect(Object.keys(switchB.conns).length).to.equal(0)
      expect(Object.keys(switchB.muxedConns).length).to.equal(1)
      tryEcho(conn, done)
    })
  })

  it('should enable identify to reuse incomming muxed conn', (done) => {
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

  /**
   * This test is being skipped until a related issue with pull-reader overreading can be resolved
   * Currently this test will time out instead of returning an error properly. This is the same issue
   * in ipfs/interop, https://github.com/ipfs/interop/pull/24/commits/179978996ecaef39e78384091aa9669dcdb94cc0
   */
  it('should fail to talk to a switch on a different private network', function (done) {
    switchD.dial(switchA._peerInfo, (err) => {
      expect(err).to.exist()
    })

    // A successful connection will return in well under 2 seconds
    setTimeout(() => {
      done()
    }, 2000)
  })
})
