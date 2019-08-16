/* eslint-env mocha */
'use strict'

const Stop = require('../../src/circuit/circuit/stop')
const nodes = require('./fixtures/nodes')
const Connection = require('interface-connection').Connection
const handshake = require('pull-handshake')
const waterfall = require('async/waterfall')
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const StreamHandler = require('../../src/circuit/circuit/stream-handler')
const proto = require('../../src/circuit/protocol')

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

describe('stop', function () {
  describe(`handle relayed connections`, function () {
    let stopHandler

    let swarm
    let conn
    let stream

    beforeEach(function (done) {
      stream = handshake({ timeout: 1000 * 60 })
      conn = new Connection(stream)
      const peerId = PeerId.createFromB58String('QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE')
      conn.setPeerInfo(new PeerInfo(peerId))

      waterfall([
        (cb) => PeerId.createFromJSON(nodes.node4, cb),
        (peerId, cb) => PeerInfo.create(peerId, cb),
        (peer, cb) => {
          peer.multiaddrs.add('/p2p-circuit/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE')
          swarm = {
            _peerInfo: peer,
            conns: {
              QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE: new Connection()
            }
          }

          stopHandler = new Stop(swarm)
          cb()
        }
      ], done)
    })

    it(`handle request with a valid multiaddr`, function (done) {
      stopHandler.handle({
        type: proto.CircuitRelay.Type.STOP,
        srcPeer: {
          id: `QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`,
          addrs: [`/ipfs/QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`]
        },
        dstPeer: {
          id: `QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`,
          addrs: [`/ipfs/QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`]
        }
      }, new StreamHandler(conn), (conn) => { // multistream handler doesn't expect errors...
        expect(conn).to.be.instanceOf(Connection)
        done()
      })
    })

    it(`handle request with invalid multiaddr`, function (done) {
      stopHandler.handle({
        type: proto.CircuitRelay.Type.STOP,
        srcPeer: {
          id: `QmSswe1dCFRepmhjAMR5VfHeokGLcvVggkuDJm7RMfJSrE`,
          addrs: [`dsfsdfsdf`]
        },
        dstPeer: {
          id: `QmQvM2mpqkjyXWbTHSUidUAWN26GgdMphTh9iGDdjgVXCy`,
          addrs: [`sdflksdfndsklfnlkdf`]
        }
      }, new StreamHandler(conn), (conn) => {
        expect(conn).to.not.exist()
        done()
      })
    })
  })
})
