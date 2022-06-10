import { protocolIDv2Stop } from './../../../src/circuit/multicodec.js'
import { pair } from 'it-pair'
import { StreamHandlerV2 } from './../../../src/circuit/v2/stream-handler.js'
import type { Connection } from '@libp2p/interfaces/connection'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { createPeerIds } from '../../utils/creators/peer.js'
import { mockConnection, mockMultiaddrConnection, mockStream } from '@libp2p/interface-compliance-tests/mocks'
import { handleStop, stop } from '../../../src/circuit/v2/stop.js'
import { Status, StopMessage } from '../../../src/circuit/v2/pb/index.js'
import { expect } from 'aegir/chai'
import sinon from 'sinon'

/* eslint-env mocha */

describe('Circuit v2 - stop protocol', function () {
  let srcPeer: PeerId, relayPeer: PeerId, conn: Connection, streamHandler: StreamHandlerV2

  beforeEach(async () => {
    [srcPeer, relayPeer] = await createPeerIds(2)
    conn = await mockConnection(mockMultiaddrConnection(pair<Uint8Array>(), relayPeer))
    streamHandler = new StreamHandlerV2({ stream: mockStream(pair<Uint8Array>()) })
  })

  this.afterEach(async function () {
    streamHandler.close()
    await conn.close()
  })

  it('handle stop - success', async function () {
    await handleStop({ connection: conn, request: { type: StopMessage.Type.CONNECT, peer: { id: srcPeer.toBytes(), addrs: [] } }, streamHandler })
    const response = StopMessage.decode(await streamHandler.read())
    expect(response.status).to.be.equal(Status.OK)
  })

  it('handle stop error - invalid request - wrong type', async function () {
    await handleStop({ connection: conn, request: { type: StopMessage.Type.STATUS, peer: { id: srcPeer.toBytes(), addrs: [] } }, streamHandler })
    const response = StopMessage.decode(await streamHandler.read())
    expect(response.status).to.be.equal(Status.UNEXPECTED_MESSAGE)
  })

  it('handle stop error - invalid request - missing peer', async function () {
    await handleStop({ connection: conn, request: { type: StopMessage.Type.CONNECT }, streamHandler })
    const response = StopMessage.decode(await streamHandler.read())
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('handle stop error - invalid request - invalid peer addr', async function () {
    await handleStop({ connection: conn, request: { type: StopMessage.Type.CONNECT, peer: { id: srcPeer.toBytes(), addrs: [new Uint8Array(32)] } }, streamHandler })
    const response = StopMessage.decode(await streamHandler.read())
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('send stop - success', async function () {
    const streamStub = sinon.stub(conn, 'newStream')
    streamStub.resolves({ protocol: protocolIDv2Stop, stream: mockStream(pair<Uint8Array>()) })
    await stop({ connection: conn, request: { type: StopMessage.Type.CONNECT, peer: { id: srcPeer.toBytes(), addrs: [] } } })
    streamHandler.write(StopMessage.encode({
      type: StopMessage.Type.STATUS,
      status: Status.OK
    }))
  })

  it('send stop - should not fall apart with invalid status response', async function () {
    const streamStub = sinon.stub(conn, 'newStream')
    streamStub.resolves({ protocol: protocolIDv2Stop, stream: mockStream(pair<Uint8Array>()) })
    await stop({ connection: conn, request: { type: StopMessage.Type.CONNECT, peer: { id: srcPeer.toBytes(), addrs: [] } } })
    streamHandler.write(new Uint8Array(10))
  })
})
