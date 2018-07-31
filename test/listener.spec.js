/* eslint-env mocha */
'use strict'

const Listener = require('../src/listener')
const nodes = require('./fixtures/nodes')
const waterfall = require('async/waterfall')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const handshake = require('pull-handshake')
const Connection = require('interface-connection').Connection
const proto = require('../src/protocol')
const lp = require('pull-length-prefixed')
const pull = require('pull-stream')
const multicodec = require('../src/multicodec')

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const sinon = require('sinon')

describe('listener', function () {
  describe(`listen`, function () {
    let swarm = null
    let handlerSpy = null
    let listener = null
    let stream = null
    let shake = null
    let conn = null

    beforeEach(function (done) {
      stream = handshake({ timeout: 1000 * 60 })
      shake = stream.handshake
      conn = new Connection(stream)
      conn.setPeerInfo(new PeerInfo(PeerId
        .createFromB58String('QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE')))

      waterfall([
        (cb) => PeerId.createFromJSON(nodes.node4, cb),
        (peerId, cb) => PeerInfo.create(peerId, cb),
        (peer, cb) => {
          swarm = {
            _peerInfo: peer,
            handle: sinon.spy((proto, h) => {
              handlerSpy = sinon.spy(h)
            }),
            conns: {
              QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE: new Connection()
            }
          }

          listener = Listener(swarm, {}, () => {})
          listener.listen()
          cb()
        }
      ], done)
    })

    afterEach(() => {
      listener = null
    })

    it(`should handle HOP`, function (done) {
      handlerSpy(multicodec.relay, conn)

      let relayMsg = {
        type: proto.CircuitRelay.Type.HOP,
        srcPeer: {
          id: `QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`,
          addrs: [`/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`]
        },
        dstPeer: {
          id: `QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`,
          addrs: [`/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`]
        }
      }

      listener.hopHandler.handle = (message, conn) => {
        expect(message.type).to.equal(proto.CircuitRelay.Type.HOP)

        expect(message.srcPeer.id.toString()).to.equal(relayMsg.srcPeer.id)
        expect(message.srcPeer.addrs[0].toString()).to.equal(relayMsg.srcPeer.addrs[0])

        expect(message.dstPeer.id.toString()).to.equal(relayMsg.dstPeer.id)
        expect(message.dstPeer.addrs[0].toString()).to.equal(relayMsg.dstPeer.addrs[0])

        done()
      }

      pull(
        pull.values([proto.CircuitRelay.encode(relayMsg)]),
        lp.encode(),
        pull.collect((err, encoded) => {
          expect(err).to.not.exist()
          encoded.forEach((e) => shake.write(e))
        })
      )
    })

    it(`should handle STOP`, function (done) {
      handlerSpy(multicodec.relay, conn)

      let relayMsg = {
        type: proto.CircuitRelay.Type.STOP,
        srcPeer: {
          id: `QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`,
          addrs: [`/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`]
        },
        dstPeer: {
          id: `QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`,
          addrs: [`/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`]
        }
      }

      listener.stopHandler.handle = (message, conn) => {
        expect(message.type).to.equal(proto.CircuitRelay.Type.STOP)

        expect(message.srcPeer.id.toString()).to.equal(relayMsg.srcPeer.id)
        expect(message.srcPeer.addrs[0].toString()).to.equal(relayMsg.srcPeer.addrs[0])

        expect(message.dstPeer.id.toString()).to.equal(relayMsg.dstPeer.id)
        expect(message.dstPeer.addrs[0].toString()).to.equal(relayMsg.dstPeer.addrs[0])

        done()
      }

      pull(
        pull.values([proto.CircuitRelay.encode(relayMsg)]),
        lp.encode(),
        pull.collect((err, encoded) => {
          expect(err).to.not.exist()
          encoded.forEach((e) => shake.write(e))
        })
      )
    })

    it(`should handle CAN_HOP`, function (done) {
      handlerSpy(multicodec.relay, conn)

      let relayMsg = {
        type: proto.CircuitRelay.Type.CAN_HOP,
        srcPeer: {
          id: `QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`,
          addrs: [`/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`]
        },
        dstPeer: {
          id: `QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`,
          addrs: [`/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`]
        }
      }

      listener.hopHandler.handle = (message, conn) => {
        expect(message.type).to.equal(proto.CircuitRelay.Type.CAN_HOP)

        expect(message.srcPeer.id.toString()).to.equal(relayMsg.srcPeer.id)
        expect(message.srcPeer.addrs[0].toString()).to.equal(relayMsg.srcPeer.addrs[0])

        expect(message.dstPeer.id.toString()).to.equal(relayMsg.dstPeer.id)
        expect(message.dstPeer.addrs[0].toString()).to.equal(relayMsg.dstPeer.addrs[0])

        done()
      }

      pull(
        pull.values([proto.CircuitRelay.encode(relayMsg)]),
        lp.encode(),
        pull.collect((err, encoded) => {
          expect(err).to.not.exist()
          encoded.forEach((e) => shake.write(e))
        })
      )
    })

    it(`should handle invalid message correctly`, function (done) {
      handlerSpy(multicodec.relay, conn)

      let relayMsg = {
        type: 100000,
        srcPeer: {
          id: Buffer.from(`QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`),
          addrs: [multiaddr(`/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`).buffer]
        },
        dstPeer: {
          id: Buffer.from(`QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`),
          addrs: [multiaddr(`/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`).buffer]
        }
      }

      pull(
        pull.values([Buffer.from([relayMsg])]),
        lp.encode(),
        pull.collect((err, encoded) => {
          expect(err).to.not.exist()
          encoded.forEach((e) => shake.write(e))
        }),
        lp.decodeFromReader(shake, { maxLength: this.maxLength }, (err, msg) => {
          expect(err).to.not.exist()
          expect(proto.CircuitRelay.decode(msg).type).to.equal(proto.CircuitRelay.Type.STATUS)
          expect(proto.CircuitRelay.decode(msg).code).to.equal(proto.CircuitRelay.Status.MALFORMED_MESSAGE)
          done()
        })
      )
    })
  })

  describe(`getAddrs`, function () {
    let swarm = null
    let listener = null
    let peerInfo = null

    beforeEach(function (done) {
      waterfall([
        (cb) => PeerId.createFromJSON(nodes.node4, cb),
        (peerId, cb) => PeerInfo.create(peerId, cb),
        (peer, cb) => {
          swarm = {
            _peerInfo: peer
          }

          peerInfo = peer
          listener = Listener(swarm, {}, () => {})
          cb()
        }
      ], done)
    })

    afterEach(() => {
      peerInfo = null
    })

    it(`should return correct addrs`, function () {
      peerInfo.multiaddrs.add(`/ip4/0.0.0.0/tcp/4002`)
      peerInfo.multiaddrs.add(`/ip4/127.0.0.1/tcp/4003/ws`)

      listener.getAddrs((err, addrs) => {
        expect(err).to.not.exist()
        expect(addrs).to.deep.equal([
          multiaddr(`/p2p-circuit/ip4/0.0.0.0/tcp/4002/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`),
          multiaddr(`/p2p-circuit/ip4/127.0.0.1/tcp/4003/ws/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`)])
      })
    })

    it(`don't return default addrs in an explicit p2p-circuit addres`, function () {
      peerInfo.multiaddrs.add(`/ip4/127.0.0.1/tcp/4003/ws`)
      peerInfo.multiaddrs.add(`/p2p-circuit/ip4/0.0.0.0/tcp/4002`)
      listener.getAddrs((err, addrs) => {
        expect(err).to.not.exist()
        expect(addrs[0]
          .toString())
          .to.equal(`/p2p-circuit/ip4/0.0.0.0/tcp/4002/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`)
      })
    })
  })
})
