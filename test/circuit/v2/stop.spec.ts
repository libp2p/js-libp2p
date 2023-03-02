import { pair } from 'it-pair'
import type { Connection, Stream } from '@libp2p/interface-connection'
import type { PeerId } from '@libp2p/interface-peer-id'
import { createPeerIds } from '../../utils/creators/peer.js'
import { handleStop, stop } from '../../../src/circuit/v2/stop.js'
import { Status, StopMessage } from '../../../src/circuit/v2/pb/index.js'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { mockConnection, mockMultiaddrConnection, mockStream } from '@libp2p/interface-mocks'
import { pbStream, ProtobufStream } from 'it-pb-stream'

/* eslint-env mocha */

describe('Circuit v2 - stop protocol', function () {
  let srcPeer: PeerId, relayPeer: PeerId, conn: Connection, pbstr: ProtobufStream<Stream>

  beforeEach(async () => {
    [srcPeer, relayPeer] = await createPeerIds(2)
    conn = mockConnection(mockMultiaddrConnection(pair<Uint8Array>(), relayPeer))
    pbstr = pbStream(mockStream(pair<any>()))
  })

  this.afterEach(async function () {
    await conn.close()
  })

  it('handle stop - success', async function () {
    await handleStop({ connection: conn, request: { type: StopMessage.Type.CONNECT, peer: { id: srcPeer.toBytes(), addrs: [] } }, pbstr })
    const response = await pbstr.pb(StopMessage).read()
    expect(response.status).to.be.equal(Status.OK)
  })

  it('handle stop error - invalid request - wrong type', async function () {
    await handleStop({ connection: conn, request: { type: StopMessage.Type.STATUS, peer: { id: srcPeer.toBytes(), addrs: [] } }, pbstr })
    const response = await pbstr.pb(StopMessage).read()
    expect(response.status).to.be.equal(Status.UNEXPECTED_MESSAGE)
  })

  it('handle stop error - invalid request - missing peer', async function () {
    await handleStop({ connection: conn, request: { type: StopMessage.Type.CONNECT }, pbstr })
    const response = await pbstr.pb(StopMessage).read()
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('handle stop error - invalid request - invalid peer addr', async function () {
    await handleStop({ connection: conn, request: { type: StopMessage.Type.CONNECT, peer: { id: srcPeer.toBytes(), addrs: [new Uint8Array(32)] } }, pbstr })
    const response = await pbstr.pb(StopMessage).read()
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('send stop - success', async function () {
    const streamStub = sinon.stub(conn, 'newStream')
    streamStub.resolves(mockStream(pair<any>()))
    await stop({ connection: conn, request: { type: StopMessage.Type.CONNECT, peer: { id: srcPeer.toBytes(), addrs: [] } } })
    pbstr.pb(StopMessage).write({ type: StopMessage.Type.STATUS, status: Status.OK })
  })

  it('send stop - should not fall apart with invalid status response', async function () {
    const streamStub = sinon.stub(conn, 'newStream')
    streamStub.resolves(mockStream(pair<any>()))
    await stop({ connection: conn, request: { type: StopMessage.Type.CONNECT, peer: { id: srcPeer.toBytes(), addrs: [] } } })
    pbstr.write(new Uint8Array(10))
  })
})
