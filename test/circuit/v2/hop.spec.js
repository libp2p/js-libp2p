
'use strict'

/* eslint-env mocha */

const mockConnection = require('../../utils/mockConnection')
const { expect } = require('aegir/utils/chai')
const peerUtils = require('../../utils/creators/peer')
const { handleHopProtocol } = require('../../../src/circuit/v2/hop')
const StreamHandler = require('../../../src/circuit/v2/stream-handler')
const multicodec = require('../../../src/circuit/multicodec')
const { Status, HopMessage } = require('../../../src/circuit/v2/protocol')
const { Multiaddr } = require('multiaddr')
const sinon = require('sinon')

describe('Circuit v2 - hop protocol', function () {
  it('error on unknow message type', async function () {
    const conn = await mockConnection()
    const { stream } = await conn.newStream([multicodec.protocolIDv2Hop])
    const streamHandler = new StreamHandler({ stream })
    await handleHopProtocol({
      connection: conn,
      streamHandler,
      request: {
        type: 'not_existing'
      }
    })
    const msg = HopMessage.decode(await streamHandler.read())
    expect(msg.type).to.be.equal(HopMessage.Type.STATUS)
    expect(msg.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  describe('reserve', function () {
    let srcPeer, relayPeer, conn, streamHandler, reservationStore

    beforeEach(async () => {
      [srcPeer, relayPeer] = await peerUtils.createPeerId({ number: 2 })
      conn = await mockConnection({ localPeer: srcPeer, remotePeer: relayPeer })
      const { stream } = await conn.newStream([multicodec.protocolIDv2Hop])
      streamHandler = new StreamHandler({ stream })
      reservationStore = {
        reserve: sinon.stub(),
        removeReservation: sinon.stub()
      }
    })

    this.afterEach(async function () {
      streamHandler.close()
      await conn.close()
    })

    it('should reserve slot', async function () {
      const expire = 123
      reservationStore.reserve.resolves({ status: Status.OK, expire })
      await handleHopProtocol({
        request: {
          type: HopMessage.Type.RESERVE
        },
        connection: conn,
        streamHandler,
        relayPeer,
        relayAddrs: [new Multiaddr('/ip4/127.0.0.1/udp/1234')],
        reservationStore
      })
      expect(reservationStore.reserve.calledOnceWith(conn.remotePeer, conn.remoteAddr)).to.be.true()
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.limit).to.be.null()
      expect(response.status).to.be.equal(Status.OK)
      expect(response.reservation.expire.toNumber()).to.be.equal(expire)
      expect(response.reservation.voucher).to.not.be.null()
      expect(response.reservation.addrs.length).to.be.greaterThan(0)
    })

    it('should fail to reserve slot - acl denied', async function () {
      await handleHopProtocol({
        request: {
          type: HopMessage.Type.RESERVE
        },
        connection: conn,
        streamHandler,
        relayPeer,
        relayAddrs: [new Multiaddr('/ip4/127.0.0.1/udp/1234')],
        reservationStore,
        acl: { allowReserve: function () { return false } }
      })
      expect(reservationStore.reserve.notCalled).to.be.true()
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.limit).to.be.null()
      expect(response.status).to.be.equal(Status.PERMISSION_DENIED)
    })

    it('should fail to reserve slot - resource exceeded', async function () {
      reservationStore.reserve.resolves({ status: Status.RESOURCE_LIMIT_EXCEEDED })
      await handleHopProtocol({
        request: {
          type: HopMessage.Type.RESERVE
        },
        connection: conn,
        streamHandler,
        relayPeer,
        relayAddrs: [new Multiaddr('/ip4/127.0.0.1/udp/1234')],
        reservationStore
      })
      expect(reservationStore.reserve.calledOnce).to.be.true()
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.limit).to.be.null()
      expect(response.status).to.be.equal(Status.RESOURCE_LIMIT_EXCEEDED)
    })

    it('should fail to reserve slot - failed to write response', async function () {
      reservationStore.reserve.resolves({ status: Status.OK, expire: 123 })
      reservationStore.removeReservation.resolves()
      // TODO: seems like closing stream or connection doesn't trigger error
      const backup = streamHandler.write
      streamHandler.write = function () { throw new Error('connection reset') }
      await handleHopProtocol({
        request: {
          type: HopMessage.Type.RESERVE
        },
        connection: conn,
        streamHandler,
        relayPeer,
        relayAddrs: [new Multiaddr('/ip4/127.0.0.1/udp/1234')],
        reservationStore
      })
      expect(reservationStore.reserve.calledOnce).to.be.true()
      expect(reservationStore.removeReservation.calledOnce).to.be.true()
      streamHandler.write = backup
    })
  })

  describe('connect', function () {
    let srcPeer, relayPeer, dstPeer, conn, streamHandler, reservationStore, circuit

    beforeEach(async () => {
      [srcPeer, relayPeer, dstPeer] = await peerUtils.createPeerId({ number: 3 })
      conn = await mockConnection({ localPeer: srcPeer, remotePeer: relayPeer })
      const { stream } = await conn.newStream([multicodec.protocolIDv2Hop])
      streamHandler = new StreamHandler({ stream })
      reservationStore = {
        reserve: sinon.stub(),
        removeReservation: sinon.stub(),
        hasReservation: sinon.stub()
      }
      circuit = {
        _connectionManager: {
          get: sinon.stub()
        }
      }
    })

    this.afterEach(async function () {
      streamHandler.close()
      await conn.close()
    })

    it('should succeed to connect', async function () {
      reservationStore.hasReservation.resolves(Status.OK)
      const dstConn = await mockConnection({ localPeer: dstPeer, remotePeer: relayPeer })
      circuit._connectionManager.get.returns(dstConn)
      await handleHopProtocol({
        connection: conn,
        streamHandler,
        request: {
          type: HopMessage.Type.CONNECT,
          peer: {
            id: dstPeer.id,
            addrs: []
          }
        },
        reservationStore,
        circuit
      })
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.status).to.be.equal(Status.OK)
    })

    it('should succeed to connect', async function () {
      reservationStore.hasReservation.resolves(Status.OK)
      const dstConn = await mockConnection({ localPeer: dstPeer, remotePeer: relayPeer })
      circuit._connectionManager.get.returns(dstConn)
      await handleHopProtocol({
        connection: conn,
        streamHandler,
        request: {
          type: HopMessage.Type.CONNECT,
          peer: {
            id: dstPeer.id,
            addrs: []
          }
        },
        reservationStore,
        circuit
      })
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.status).to.be.equal(Status.OK)
    })

    it('should fail to connect - invalid request', async function () {
      await handleHopProtocol({
        connection: conn,
        streamHandler,
        request: {
          type: HopMessage.Type.CONNECT,
          peer: {
          }
        },
        reservationStore,
        circuit
      })
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
    })

    it('should failed to connect - acl denied', async function () {
      const acl = {
        allowConnect: function () { return Status.PERMISSION_DENIED }
      }
      await handleHopProtocol({
        connection: conn,
        streamHandler,
        request: {
          type: HopMessage.Type.CONNECT,
          peer: {
            id: dstPeer.id,
            addrs: []
          }
        },
        reservationStore,
        circuit,
        acl
      })
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.status).to.be.equal(Status.PERMISSION_DENIED)
    })

    it('should fail to connect - no reservation', async function () {
      reservationStore.hasReservation.resolves(Status.NO_RESERVATION)
      await handleHopProtocol({
        connection: conn,
        streamHandler,
        request: {
          type: HopMessage.Type.CONNECT,
          peer: {
            id: dstPeer.id,
            addrs: []
          }
        },
        reservationStore,
        circuit
      })
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.status).to.be.equal(Status.NO_RESERVATION)
    })

    it('should fail to connect - no connection', async function () {
      reservationStore.hasReservation.resolves(Status.OK)
      await handleHopProtocol({
        connection: conn,
        streamHandler,
        request: {
          type: HopMessage.Type.CONNECT,
          peer: {
            id: dstPeer.id,
            addrs: []
          }
        },
        reservationStore,
        circuit
      })
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.status).to.be.equal(Status.NO_RESERVATION)
      expect(circuit._connectionManager.get.calledOnce).to.be.true()
    })
  })
})
