/* eslint-env mocha */
'use strict'

const Hop = require('../src/circuit/hop')
const nodes = require('./fixtures/nodes')
const Connection = require('interface-connection').Connection
const handshake = require('pull-handshake')
const waterfall = require('async/waterfall')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const lp = require('pull-length-prefixed')
const proto = require('../src/protocol')
const StreamHandler = require('../src/circuit/stream-handler')

const sinon = require('sinon')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

describe('relay', function () {
  describe(`should handle circuit requests`, function () {
    let relay
    let swarm
    let fromConn
    let stream
    let shake

    beforeEach(function (done) {
      stream = handshake({ timeout: 1000 * 60 })
      shake = stream.handshake
      fromConn = new Connection(stream)
      fromConn.setPeerInfo(new PeerInfo(PeerId.createFromB58String('QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA')))

      let peers = {
        QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE:
          new PeerInfo(PeerId.createFromB58String(`QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`)),
        QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA:
          new PeerInfo(PeerId.createFromB58String(`QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`)),
        QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy:
          new PeerInfo(PeerId.createFromB58String(`QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`))
      }

      Object.keys(peers).forEach((key) => { peers[key]._connectedMultiaddr = true }) // make it truthy

      waterfall([
        (cb) => PeerId.createFromJSON(nodes.node4, cb),
        (peerId, cb) => PeerInfo.create(peerId, cb),
        (peer, cb) => {
          peer.multiaddrs.add('/p2p-circuit/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE')
          swarm = {
            _peerInfo: peer,
            conns: {
              QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE: new Connection(),
              QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA: new Connection(),
              QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy: new Connection()
            },
            _peerBook: {
              get: (peer) => {
                if (!peers[peer]) {
                  throw new Error()
                }

                return peers[peer]
              }
            }
          }

          cb()
        }
      ], () => {
        relay = new Hop(swarm, { enabled: true })
        relay._circuit = sinon.stub()
        relay._circuit.callsArg(2, null, new Connection())
        done()
      })
    })

    afterEach(() => {
      relay._circuit.reset()
    })

    it(`should handle a valid circuit request`, function (done) {
      let relayMsg = {
        type: proto.CircuitRelay.Type.HOP,
        srcPeer: {
          id: PeerId.createFromB58String(`QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`).id,
          addrs: [multiaddr(`/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`).buffer]
        },
        dstPeer: {
          id: PeerId.createFromB58String(`QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`).id,
          addrs: [multiaddr(`/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`).buffer]
        }
      }

      relay.on('circuit:success', () => {
        expect(relay._circuit.calledWith(sinon.match.any, relayMsg)).to.be.ok()
        done()
      })

      relay.handle(relayMsg, new StreamHandler(fromConn))
    })

    it(`should handle a request to passive circuit`, function (done) {
      let relayMsg = {
        type: proto.CircuitRelay.Type.HOP,
        srcPeer: {
          id: PeerId.createFromB58String(`QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`).id,
          addrs: [multiaddr(`/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`).buffer]
        },
        dstPeer: {
          id: PeerId.createFromB58String(`QmYJjAri5soV8RbeQcHaYYcTAYTET17QTvcoFMyKvRDTXe`).id,
          addrs: [multiaddr(`/ipfs/QmYJjAri5soV8RbeQcHaYYcTAYTET17QTvcoFMyKvRDTXe`).buffer]
        }
      }

      relay.active = false
      lp.decodeFromReader(shake, (err, msg) => {
        expect(err).to.be.null()

        const response = proto.CircuitRelay.decode(msg)
        expect(response.code).to.equal(proto.CircuitRelay.Status.HOP_NO_CONN_TO_DST)
        expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS)
        done()
      })

      relay.handle(relayMsg, new StreamHandler(fromConn))
    })

    it(`should handle a request to active circuit`, function (done) {
      let relayMsg = {
        type: proto.CircuitRelay.Type.HOP,
        srcPeer: {
          id: PeerId.createFromB58String(`QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`).id,
          addrs: [multiaddr(`/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`).buffer]
        },
        dstPeer: {
          id: PeerId.createFromB58String(`QmYJjAri5soV8RbeQcHaYYcTAYTET17QTvcoFMyKvRDTXe`).id,
          addrs: [multiaddr(`/ipfs/QmYJjAri5soV8RbeQcHaYYcTAYTET17QTvcoFMyKvRDTXe`).buffer]
        }
      }

      relay.active = true
      relay.on('circuit:success', () => {
        expect(relay._circuit.calledWith(sinon.match.any, relayMsg)).to.be.ok()
        done()
      })

      relay.on('circuit:error', (err) => {
        done(err)
      })

      relay.handle(relayMsg, new StreamHandler(fromConn))
    })

    it(`not dial to self`, function (done) {
      let relayMsg = {
        type: proto.CircuitRelay.Type.HOP,
        srcPeer: {
          id: PeerId.createFromB58String(`QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`).id,
          addrs: [multiaddr(`/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`).buffer]
        },
        dstPeer: {
          id: PeerId.createFromB58String(`QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`).id,
          addrs: [multiaddr(`/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`).buffer]
        }
      }

      lp.decodeFromReader(shake, (err, msg) => {
        expect(err).to.be.null()

        const response = proto.CircuitRelay.decode(msg)
        expect(response.code).to.equal(proto.CircuitRelay.Status.HOP_CANT_RELAY_TO_SELF)
        expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS)
        done()
      })

      relay.handle(relayMsg, new StreamHandler(fromConn))
    })

    it(`fail on invalid src address`, function (done) {
      let relayMsg = {
        type: proto.CircuitRelay.Type.HOP,
        srcPeer: {
          id: `sdfkjsdnfkjdsb`,
          addrs: [`sdfkjsdnfkjdsb`]
        },
        dstPeer: {
          id: PeerId.createFromB58String(`QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`).id,
          addrs: [multiaddr(`/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`).buffer]
        }
      }

      lp.decodeFromReader(shake, (err, msg) => {
        expect(err).to.be.null()

        const response = proto.CircuitRelay.decode(msg)
        expect(response.code).to.equal(proto.CircuitRelay.Status.HOP_SRC_MULTIADDR_INVALID)
        expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS)
        done()
      })

      relay.handle(relayMsg, new StreamHandler(fromConn))
    })

    it(`fail on invalid dst address`, function (done) {
      let relayMsg = {
        type: proto.CircuitRelay.Type.HOP,
        srcPeer: {
          id: PeerId.createFromB58String(`QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`).id,
          addrs: [multiaddr(`/ipfs/QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`).buffer]
        },
        dstPeer: {
          id: PeerId.createFromB58String(`QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`).id,
          addrs: [`sdfkjsdnfkjdsb`]
        }
      }

      lp.decodeFromReader(shake, (err, msg) => {
        expect(err).to.be.null()

        const response = proto.CircuitRelay.decode(msg)
        expect(response.code).to.equal(proto.CircuitRelay.Status.HOP_DST_MULTIADDR_INVALID)
        expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS)
        done()
      })

      relay.handle(relayMsg, new StreamHandler(fromConn))
    })
  })
})
