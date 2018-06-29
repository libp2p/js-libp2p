/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const Hop = require('../src/circuit/hop')
const nodes = require('./fixtures/nodes')
const Connection = require('interface-connection').Connection
const handshake = require('pull-handshake')
const waterfall = require('async/waterfall')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const pull = require('pull-stream/pull')
const values = require('pull-stream/sources/values')
const collect = require('pull-stream/sinks/collect')
const lp = require('pull-length-prefixed')
const proto = require('../src/protocol')
const StreamHandler = require('../src/circuit/stream-handler')

const sinon = require('sinon')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

describe('relay', () => {
  describe(`.handle`, () => {
    let relay
    let swarm
    let fromConn
    let stream
    let shake

    beforeEach((done) => {
      stream = handshake({ timeout: 1000 * 60 })
      shake = stream.handshake
      fromConn = new Connection(stream)
      const peerInfo = new PeerInfo(PeerId.createFromB58String('QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA'))
      fromConn.setPeerInfo(peerInfo)

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
        relay._circuit.callsArgWith(2, null, new Connection())
        done()
      })
    })

    afterEach(() => {
      relay._circuit.reset()
    })

    it(`should handle a valid circuit request`, (done) => {
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

    it(`should handle a request to passive circuit`, (done) => {
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
      lp.decodeFromReader(
        shake,
        (err, msg) => {
          expect(err).to.not.exist()

          const response = proto.CircuitRelay.decode(msg)
          expect(response.code).to.equal(proto.CircuitRelay.Status.HOP_NO_CONN_TO_DST)
          expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS)
          done()
        })

      relay.handle(relayMsg, new StreamHandler(fromConn))
    })

    it(`should handle a request to active circuit`, (done) => {
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

    it(`not dial to self`, (done) => {
      let relayMsg = {
        type: proto.CircuitRelay.Type.HOP,
        srcPeer: {
          id: PeerId.createFromB58String(`QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`).id,
          addrs: [multiaddr(`/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`).buffer]
        },
        dstPeer: {
          id: PeerId.createFromB58String(`QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`).id,
          addrs: [multiaddr(`/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`).buffer]
        }
      }

      lp.decodeFromReader(
        shake,
        (err, msg) => {
          expect(err).to.not.exist()

          const response = proto.CircuitRelay.decode(msg)
          expect(response.code).to.equal(proto.CircuitRelay.Status.HOP_CANT_RELAY_TO_SELF)
          expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS)
          done()
        })

      relay.handle(relayMsg, new StreamHandler(fromConn))
    })

    it(`fail on invalid src address`, (done) => {
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

      lp.decodeFromReader(
        shake,
        (err, msg) => {
          expect(err).to.not.exist()

          const response = proto.CircuitRelay.decode(msg)
          expect(response.code).to.equal(proto.CircuitRelay.Status.HOP_SRC_MULTIADDR_INVALID)
          expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS)
          done()
        })

      relay.handle(relayMsg, new StreamHandler(fromConn))
    })

    it(`fail on invalid dst address`, (done) => {
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

      lp.decodeFromReader(
        shake,
        (err, msg) => {
          expect(err).to.not.exist()

          const response = proto.CircuitRelay.decode(msg)
          expect(response.code).to.equal(proto.CircuitRelay.Status.HOP_DST_MULTIADDR_INVALID)
          expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS)
          done()
        })

      relay.handle(relayMsg, new StreamHandler(fromConn))
    })
  })

  describe(`._circuit`, () => {
    let relay
    let swarm
    let srcConn
    let dstConn
    let srcStream
    let dstStream
    let srcShake
    let dstShake

    before((done) => {
      srcStream = handshake({ timeout: 1000 * 60 })
      srcShake = srcStream.handshake
      srcConn = new Connection(srcStream)
      dstStream = handshake({ timeout: 1000 * 60 })
      dstShake = dstStream.handshake
      dstConn = new Connection(dstStream)
      const peerInfo = new PeerInfo(PeerId.createFromB58String('QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA'))
      srcConn.setPeerInfo(peerInfo)

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
        relay._dialPeer = sinon.stub()
        relay._dialPeer.callsArgWith(1, null, dstConn)

        done()
      })
    })

    after(() => relay._dialPeer.reset())

    describe('should correctly dial destination node', () => {
      let msg = {
        type: proto.CircuitRelay.Type.STOP,
        srcPeer: {
          id: Buffer.from(`QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`),
          addrs: [Buffer.from(`dsfsdfsdf`)]
        },
        dstPeer: {
          id: Buffer.from(`QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`),
          addrs: [Buffer.from(`sdflksdfndsklfnlkdf`)]
        }
      }

      before(() => {
        relay._circuit(
          new StreamHandler(srcConn),
          msg,
          (err) => {
            expect(err).to.not.exist()
          })
      })

      it('should respond with SUCCESS to source node', (done) => {
        lp.decodeFromReader(
          srcShake,
          (err, msg) => {
            expect(err).to.not.exist()

            const response = proto.CircuitRelay.decode(msg)
            expect(response.type).to.equal(proto.CircuitRelay.Type.STATUS)
            expect(response.code).to.equal(proto.CircuitRelay.Status.SUCCESS)
            done()
          })
      })

      it('should send STOP message to destination node', (done) => {
        lp.decodeFromReader(
          dstShake,
          (err, _msg) => {
            expect(err).to.not.exist()

            const response = proto.CircuitRelay.decode(_msg)
            expect(response.type).to.deep.equal(msg.type)
            expect(response.srcPeer).to.deep.equal(msg.srcPeer)
            expect(response.dstPeer).to.deep.equal(msg.dstPeer)
            done()
          })
      })

      it('should create circuit', (done) => {
        pull(
          values([proto.CircuitRelay.encode({
            type: proto.CircuitRelay.Type.STATUS,
            code: proto.CircuitRelay.Status.SUCCESS
          })]),
          lp.encode(),
          collect((err, encoded) => {
            expect(err).to.not.exist()

            encoded.forEach((e) => dstShake.write(e))
            pull(
              values([Buffer.from('hello')]),
              lp.encode(),
              collect((err, encoded) => {
                expect(err).to.not.exist()

                encoded.forEach((e) => srcShake.write(e))
                lp.decodeFromReader(
                  dstShake,
                  (err, _msg) => {
                    expect(err).to.not.exist()
                    expect(_msg.toString()).to.equal('hello')

                    done()
                  })
              })
            )
          })
        )
      })
    })

    describe('should fail creating circuit', () => {
      let msg = {
        type: proto.CircuitRelay.Type.STOP,
        srcPeer: {
          id: Buffer.from(`QmQWqGdndSpAkxfk8iyiJyz3XXGkrDNujvc8vEst3baubA`),
          addrs: [Buffer.from(`dsfsdfsdf`)]
        },
        dstPeer: {
          id: Buffer.from(`QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`),
          addrs: [Buffer.from(`sdflksdfndsklfnlkdf`)]
        }
      }

      it('should not create circuit', (done) => {
        relay._circuit(
          new StreamHandler(srcConn),
          msg,
          (err) => {
            expect(err).to.exist()
            expect(err).to.match(/Unable to create circuit!/)
            done()
          })

        pull(
          values([proto.CircuitRelay.encode({
            type: proto.CircuitRelay.Type.STATUS,
            code: proto.CircuitRelay.Status.STOP_RELAY_REFUSED
          })]),
          lp.encode(),
          collect((err, encoded) => {
            expect(err).to.not.exist()

            encoded.forEach((e) => dstShake.write(e))
          })
        )
      })
    })
  })
})
