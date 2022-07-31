import type { Connection } from '@libp2p/interface-connection'
import { mockConnection, mockDuplex, mockMultiaddrConnection, mockStream } from '@libp2p/interface-mocks'
import type { PeerId } from '@libp2p/interface-peer-id'
import { Multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { pair } from 'it-pair'
import sinon from 'sinon'
import { Circuit } from '../../../src/circuit/transport.js'
import { handleHopProtocol } from '../../../src/circuit/v2/hop.js'
import { HopMessage, Status, StopMessage } from '../../../src/circuit/v2/pb/index.js'
import { ReservationStore } from '../../../src/circuit/v2/reservation-store.js'
import { StreamHandlerV2 } from '../../../src/circuit/v2/stream-handler.js'
import * as peerUtils from '../../utils/creators/peer.js'

/* eslint-env mocha */

describe('Circuit v2 - hop protocol', function () {
  it('error on unknow message type', async function () {
    const streamHandler = new StreamHandlerV2({ stream: mockStream(pair<Uint8Array>()) })
    await handleHopProtocol({
      connection: mockConnection(mockMultiaddrConnection(mockDuplex(), await peerUtils.createPeerId())),
      streamHandler,
      request: {
        // @ts-expect-error
        type: 'not_existing'
      }
    })
    const msg = HopMessage.decode(await streamHandler.read())
    expect(msg.type).to.be.equal(HopMessage.Type.STATUS)
    expect(msg.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  describe('reserve', function () {
    let relayPeer: PeerId, conn: Connection, streamHandler: StreamHandlerV2, reservationStore: ReservationStore

    beforeEach(async () => {
      [, relayPeer] = await peerUtils.createPeerIds(2)
      conn = await mockConnection(mockMultiaddrConnection(mockDuplex(), relayPeer))
      streamHandler = new StreamHandlerV2({ stream: mockStream(pair<Uint8Array>()) })
      reservationStore = new ReservationStore()
    })

    this.afterEach(async function () {
      streamHandler.close()
      await conn.close()
    })

    it('should reserve slot', async function () {
      const expire: bigint = 123n
      const reserveStub = sinon.stub(reservationStore, 'reserve')
      reserveStub.resolves({ status: Status.OK, expire })
      await handleHopProtocol({
        request: {
          type: HopMessage.Type.RESERVE
        },
        connection: conn,
        streamHandler,
        relayPeer,
        circuit: sinon.stub() as any,
        relayAddrs: [new Multiaddr('/ip4/127.0.0.1/udp/1234')],
        reservationStore
      })
      expect(reserveStub.calledOnceWith(conn.remotePeer, conn.remoteAddr)).to.be.true()
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.limit).to.be.undefined()
      expect(response.status).to.be.equal(Status.OK)
      expect(response.reservation?.expire).to.be.equal(expire)
      expect(response.reservation?.voucher).to.not.be.undefined()
      expect(response.reservation?.addrs?.length).to.be.greaterThan(0)
    })

    it('should fail to reserve slot - acl denied', async function () {
      const reserveStub = sinon.stub(reservationStore, 'reserve')
      await handleHopProtocol({
        request: {
          type: HopMessage.Type.RESERVE
        },
        connection: conn,
        streamHandler,
        relayPeer,
        circuit: sinon.stub() as any,
        relayAddrs: [new Multiaddr('/ip4/127.0.0.1/udp/1234')],
        reservationStore,
        acl: { allowReserve: async function () { return false }, allowConnect: sinon.stub() as any }
      })
      expect(reserveStub.notCalled).to.be.true()
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.limit).to.be.undefined()
      expect(response.status).to.be.equal(Status.PERMISSION_DENIED)
    })

    it('should fail to reserve slot - resource exceeded', async function () {
      const reserveStub = sinon.stub(reservationStore, 'reserve')
      reserveStub.resolves({ status: Status.RESERVATION_REFUSED })
      await handleHopProtocol({
        request: {
          type: HopMessage.Type.RESERVE
        },
        connection: conn,
        streamHandler,
        relayPeer,
        circuit: sinon.stub() as any,
        relayAddrs: [new Multiaddr('/ip4/127.0.0.1/udp/1234')],
        reservationStore
      })
      expect(reserveStub.calledOnce).to.be.true()
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.limit).to.be.undefined()
      expect(response.status).to.be.equal(Status.RESERVATION_REFUSED)
    })

    it('should fail to reserve slot - failed to write response', async function () {
      const reserveStub = sinon.stub(reservationStore, 'reserve')
      const removeReservationStub = sinon.stub(reservationStore, 'removeReservation')
      reserveStub.resolves({ status: Status.OK, expire: 123n })
      removeReservationStub.resolves()
      const backup = streamHandler.write
      streamHandler.write = function () { throw new Error('connection reset') }
      await handleHopProtocol({
        request: {
          type: HopMessage.Type.RESERVE
        },
        connection: conn,
        streamHandler,
        relayPeer,
        circuit: sinon.stub() as any,
        relayAddrs: [new Multiaddr('/ip4/127.0.0.1/udp/1234')],
        reservationStore
      })
      expect(reserveStub.calledOnce).to.be.true()
      expect(removeReservationStub.calledOnce).to.be.true()
      streamHandler.write = backup
    })
  })

  describe('connect', function () {
    let relayPeer: PeerId, dstPeer: PeerId, conn: Connection, streamHandler: StreamHandlerV2, reservationStore: ReservationStore,
      circuit: Circuit

    beforeEach(async () => {
      [, relayPeer, dstPeer] = await peerUtils.createPeerIds(3)
      conn = await mockConnection(mockMultiaddrConnection(mockDuplex(), relayPeer))
      streamHandler = new StreamHandlerV2({ stream: mockStream(pair<Uint8Array>()) })
      reservationStore = new ReservationStore()
      circuit = new Circuit({
        enabled: true,
        limit: 15,
        advertise: {
          enabled: false
        },
        hop: {
          enabled: true,
          active: false,
          timeout: 30000
        },
        autoRelay: {
          enabled: false,
          maxListeners: 2
        }
      })
    })

    this.afterEach(async function () {
      streamHandler.close()
      await conn.close()
    })

    it('should succeed to connect', async function () {
      const hasReservationStub = sinon.stub(reservationStore, 'hasReservation')
      hasReservationStub.resolves(true)
      const dstConn = await mockConnection(
        mockMultiaddrConnection(pair<Uint8Array>(), dstPeer)
      )
      const streamStub = sinon.stub(dstConn, 'newStream')
      const dstStream = mockStream(pair<Uint8Array>())
      streamStub.resolves(dstStream)
      const dstStreamHandler = new StreamHandlerV2({ stream: dstStream })
      dstStreamHandler.write(StopMessage.encode({
        type: StopMessage.Type.STATUS,
        status: Status.OK
      }))
      const stub = sinon.stub(circuit, 'getPeerConnection')
      stub.returns(dstConn)
      await handleHopProtocol({
        connection: conn,
        streamHandler,
        request: {
          type: HopMessage.Type.CONNECT,
          peer: {
            id: dstPeer.toBytes(),
            addrs: []
          }
        },
        relayPeer: relayPeer,
        relayAddrs: [],
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
          // @ts-expect-error
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
            id: dstPeer.toBytes(),
            addrs: []
          }
        },
        reservationStore,
        circuit,
        // @ts-expect-error
        acl
      })
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.status).to.be.equal(Status.PERMISSION_DENIED)
    })

    it('should fail to connect - no reservation', async function () {
      const hasReservationStub = sinon.stub(reservationStore, 'hasReservation')
      hasReservationStub.resolves(false)
      await handleHopProtocol({
        connection: conn,
        streamHandler,
        request: {
          type: HopMessage.Type.CONNECT,
          peer: {
            id: dstPeer.toBytes(),
            addrs: []
          }
        },
        relayPeer: relayPeer,
        relayAddrs: [],
        reservationStore,
        circuit
      })
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.status).to.be.equal(Status.NO_RESERVATION)
    })

    it('should fail to connect - no connection', async function () {
      const hasReservationStub = sinon.stub(reservationStore, 'hasReservation')
      hasReservationStub.resolves(true)
      const stub = sinon.stub(circuit, 'getPeerConnection')
      stub.returns(undefined)
      await handleHopProtocol({
        connection: conn,
        streamHandler,
        request: {
          type: HopMessage.Type.CONNECT,
          peer: {
            id: dstPeer.toBytes(),
            addrs: []
          }
        },
        relayPeer: relayPeer,
        relayAddrs: [],
        reservationStore,
        circuit
      })
      const response = HopMessage.decode(await streamHandler.read())
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.status).to.be.equal(Status.NO_RESERVATION)
      expect(stub.calledOnce).to.be.true()
    })
  })
})
