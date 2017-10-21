/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */

'use strict'

const Dialer = require('../src/circuit/dialer')
const nodes = require('./fixtures/nodes')
const Connection = require('interface-connection').Connection
const multiaddr = require('multiaddr')
const handshake = require('pull-handshake')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const waterfall = require('async/waterfall')
const pull = require('pull-stream')
const lp = require('pull-length-prefixed')
const proto = require('../src/protocol')
const StreamHandler = require('../src/circuit/stream-handler')
const utilsFactory = require('../src/circuit/utils')

const sinon = require('sinon')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

describe(`dialer tests`, function () {
  describe(`.dial`, function () {
    const dialer = sinon.createStubInstance(Dialer)

    beforeEach(function () {
      dialer.relayPeers = new Map()
      dialer.relayPeers.set(nodes.node2.id, new Connection())
      dialer.relayPeers.set(nodes.node3.id, new Connection())
      dialer.dial.callThrough()
    })

    afterEach(function () {
      dialer._dialPeer.reset()
    })

    it(`fail on non circuit addr`, function () {
      const dstMa = multiaddr(`/ipfs/${nodes.node4.id}`)
      expect(() => dialer.dial(dstMa, (err) => {
        err.to.match(/invalid circuit address/)
      }))
    })

    it(`dial a peer`, function (done) {
      const dstMa = multiaddr(`/p2p-circuit/ipfs/${nodes.node3.id}`)
      dialer._dialPeer.callsFake(function (dstMa, relay, callback) {
        return callback(null, dialer.relayPeers.get(nodes.node3.id))
      })

      dialer.dial(dstMa, (err, conn) => {
        expect(err).to.be.null()
        expect(conn).to.be.an.instanceOf(Connection)
        done()
      })
    })

    it(`dial a peer over the specified relay`, function (done) {
      const dstMa = multiaddr(`/ipfs/${nodes.node3.id}/p2p-circuit/ipfs/${nodes.node4.id}`)
      dialer._dialPeer.callsFake(function (dstMa, relay, callback) {
        expect(relay.toString()).to.equal(`/ipfs/${nodes.node3.id}`)
        return callback(null, new Connection())
      })

      dialer.dial(dstMa, (err, conn) => {
        expect(err).to.be.null()
        expect(conn).to.be.an.instanceOf(Connection)
        done()
      })
    })
  })

  describe(`.canHop`, function () {
    const dialer = sinon.createStubInstance(Dialer)

    let stream = null
    let shake = null
    let fromConn = null
    let peer = new PeerInfo(PeerId.createFromB58String('QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA'))

    beforeEach(function () {
      stream = handshake({ timeout: 1000 * 60 })
      shake = stream.handshake
      fromConn = new Connection(stream)

      dialer.relayPeers = new Map()
      dialer.utils = utilsFactory({})
      dialer.canHop.callThrough()
    })

    afterEach(function () {
      dialer._dialRelay.reset()
    })

    it(`should handle successful CAN_HOP`, function () {
      pull(
        pull.values([proto.CircuitRelay.encode({
          type: proto.CircuitRelay.type.HOP,
          code: proto.CircuitRelay.Status.SUCCESS
        })]),
        lp.encode(),
        pull.collect((err, encoded) => {
          expect(err).to.be.null()
          encoded.forEach((e) => shake.write(e))
          dialer._dialRelay.callsFake((peer, cb) => {
            cb(null, new StreamHandler(fromConn))
          })
        })
      )

      dialer.canHop(peer, (err) => {
        expect(err).to.be.null()
        expect(dialer.relayPeers.has(peer.id.toB58String())).to.be.ok()
      })
    })

    it(`should handle failed CAN_HOP`, function () {
      pull(
        pull.values([proto.CircuitRelay.encode({
          type: proto.CircuitRelay.type.HOP,
          code: proto.CircuitRelay.Status.HOP_CANT_SPEAK_RELAY
        })]),
        lp.encode(),
        pull.collect((err, encoded) => {
          expect(err).to.be.null()
          encoded.forEach((e) => shake.write(e))
          dialer._dialRelay.callsFake((peer, cb) => {
            cb(null, new StreamHandler(fromConn))
          })
        })
      )

      dialer.canHop(peer, (err) => {
        expect(err).to.be.null()
        expect(dialer.relayPeers.has(peer.id.toB58String())).to.not.be.ok()
      })
    })
  })

  describe(`._dialPeer`, function () {
    const dialer = sinon.createStubInstance(Dialer)

    beforeEach(function () {
      dialer.relayPeers = new Map()
      dialer.relayPeers.set(nodes.node1.id, new Connection())
      dialer.relayPeers.set(nodes.node2.id, new Connection())
      dialer.relayPeers.set(nodes.node3.id, new Connection())
      dialer._dialPeer.callThrough()
    })

    afterEach(function () {
      dialer._negotiateRelay.reset()
    })

    it(`should dial a peer over any relay`, function (done) {
      const dstMa = multiaddr(`/ipfs/${nodes.node4.id}`)
      dialer._negotiateRelay.callsFake(function (conn, dstMa, callback) {
        if (conn === dialer.relayPeers.get(nodes.node3.id)) {
          return callback(null, dialer.relayPeers.get(nodes.node3.id))
        }

        callback(new Error(`error`))
      })

      dialer._dialPeer(dstMa, (err, conn) => {
        expect(err).to.be.null()
        expect(conn).to.be.an.instanceOf(Connection)
        expect(conn).to.deep.equal(dialer.relayPeers.get(nodes.node3.id))
        done()
      })
    })

    it(`should fail dialing a peer over any relay`, function (done) {
      const dstMa = multiaddr(`/ipfs/${nodes.node4.id}`)
      dialer._negotiateRelay.callsFake(function (conn, dstMa, callback) {
        callback(new Error(`error`))
      })

      dialer._dialPeer(dstMa, (err, conn) => {
        expect(conn).to.be.undefined()
        expect(err).to.not.be.null()
        expect(err).to.equal(`no relay peers were found or all relays failed to dial`)
        done()
      })
    })
  })

  describe(`._negotiateRelay`, function () {
    const dialer = sinon.createStubInstance(Dialer)
    const dstMa = multiaddr(`/ipfs/${nodes.node4.id}`)

    let conn
    let stream
    let shake
    let callback = sinon.stub()

    beforeEach(function (done) {
      waterfall([
        (cb) => PeerId.createFromJSON(nodes.node4, cb),
        (peerId, cb) => PeerInfo.create(peerId, cb),
        (peer, cb) => {
          peer.multiaddrs.add(`/p2p-circuit/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`)
          dialer.swarm = {
            _peerInfo: peer
          }
          cb()
        },
        (cb) => {
          dialer.relayConns = new Map()
          dialer._negotiateRelay.callThrough()
          stream = handshake({ timeout: 1000 * 60 })
          shake = stream.handshake
          conn = new Connection()
          conn.setPeerInfo(new PeerInfo(PeerId.createFromB58String(`QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`)))
          conn.setInnerConn(stream)
          dialer._negotiateRelay(conn, dstMa, callback)
          cb()
        }
      ], done)
    })

    afterEach(() => {
      callback.reset()
    })

    it(`should write the correct dst addr`, function (done) {
      lp.decodeFromReader(shake, (err, msg) => {
        shake.write(proto.CircuitRelay.encode({
          type: proto.CircuitRelay.Type.STATUS,
          code: proto.CircuitRelay.Status.SUCCESS
        }))
        expect(err).to.be.null()
        expect(proto.CircuitRelay.decode(msg).dstPeer.addrs[0]).to.deep.equal(dstMa.buffer)
        done()
      })
    })

    it(`should handle failed relay negotiation`, function (done) {
      callback.callsFake((err, msg) => {
        expect(err).to.not.be.null()
        expect(err).to.be.an.instanceOf(Error)
        expect(err.message).to.be.equal(`Got 400 error code trying to dial over relay`)
        expect(callback.calledOnce).to.be.ok()
        done()
      })

      // send failed message
      lp.decodeFromReader(shake, (err, msg) => {
        if (err) return done(err)

        pull(
          pull.values([proto.CircuitRelay.encode({
            type: proto.CircuitRelay.Type.STATUS,
            code: proto.CircuitRelay.Status.MALFORMED_MESSAGE
          })]), // send arbitrary non 200 code
          lp.encode(),
          pull.collect((err, encoded) => {
            expect(err).to.be.null()
            encoded.forEach((e) => shake.write(e))
          })
        )
      })
    })
  })
})
