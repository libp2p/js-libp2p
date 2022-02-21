'use strict'

/* eslint-env mocha */

const mockConnection = require('../../utils/mockConnection')
const { expect } = require('aegir/utils/chai')
const peerUtils = require('../../utils/creators/peer')
const { handleStop, stop } = require('../../../src/circuit/v2/stop')
const StreamHandler = require('../../../src/circuit/v2/stream-handler')
const multicodec = require('../../../src/circuit/multicodec')
const { StopMessage, Status } = require('../../../src/circuit/v2/protocol')

describe('Circuit v2 - stop protocol', function () {
  let srcPeer, destPeer, conn, streamHandler

  beforeEach(async () => {
    [srcPeer, destPeer] = await peerUtils.createPeerId({ number: 2 })
    conn = await mockConnection({ localPeer: srcPeer, remotePeer: destPeer })
    const { stream } = await conn.newStream([multicodec.protocolIDv2Stop])
    streamHandler = new StreamHandler({ stream })
  })

  this.afterEach(async function () {
    streamHandler.close()
    await conn.close()
  })

  it('handle stop - success', async function () {
    await handleStop({ connection: conn, request: { type: StopMessage.Type.CONNECT, peer: { id: srcPeer.id, addrs: [] } }, streamHandler })
    const response = StopMessage.decode(await streamHandler.read())
    expect(response.status).to.be.equal(Status.OK)
  })

  it('handle stop error - invalid request - wrong type', async function () {
    await handleStop({ connection: conn, request: { type: StopMessage.Type.STATUS, peer: { id: srcPeer.id, addrs: [] } }, streamHandler })
    const response = StopMessage.decode(await streamHandler.read())
    expect(response.status).to.be.equal(Status.UNEXPECTED_MESSAGE)
  })

  it('handle stop error - invalid request - missing peer', async function () {
    await handleStop({ connection: conn, request: { type: StopMessage.Type.CONNECT }, streamHandler })
    const response = StopMessage.decode(await streamHandler.read())
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('handle stop error - invalid request - invalid peer addr', async function () {
    await handleStop({ connection: conn, request: { type: StopMessage.Type.CONNECT, peer: { id: srcPeer.id, addrs: [new Uint8Array(32)] } }, streamHandler })
    const response = StopMessage.decode(await streamHandler.read())
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('send stop - success', async function () {
    await stop({ connection: conn, request: { type: StopMessage.Type.CONNECT, peer: { id: srcPeer.id, addrs: [] } } })
    streamHandler.write(StopMessage.encode({
      type: StopMessage.Type.STATUS,
      status: Status.OK
    }).finish())
  })

  it('send stop - should not fall apart with invalid status response', async function () {
    await stop({ connection: conn, request: { type: StopMessage.Type.CONNECT, peer: { id: srcPeer.id, addrs: [] } } })
    streamHandler.write(new Uint8Array(10))
  })
})
