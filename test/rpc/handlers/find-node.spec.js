/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const Message = require('../../../src/message')
const handler = require('../../../src/rpc/handlers/find-node')
const uint8ArrayFromString = require('uint8arrays/from-string')

const T = Message.TYPES.FIND_NODE

const createPeerId = require('../../utils/create-peer-id')
const TestDHT = require('../../utils/test-dht')

describe('rpc - handlers - FindNode', () => {
  let peerIds
  let tdht
  let dht

  before(async () => {
    peerIds = await createPeerId(3)
  })

  beforeEach(async () => {
    tdht = new TestDHT()

    const dhts = await tdht.spawn(1)
    dht = dhts[0]
  })

  afterEach(() => tdht.teardown())

  it('returns self, if asked for self', async () => {
    const msg = new Message(T, dht.peerId.id, 0)

    const response = await handler(dht)(peerIds[1], msg)

    expect(response.closerPeers).to.have.length(1)
    const peer = response.closerPeers[0]

    expect(peer.id.id).to.be.eql(dht.peerId.id)
  })

  it('returns closer peers', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 0)
    const other = peerIds[1]

    await dht._add(other)
    const response = await handler(dht)(peerIds[2].id, msg)

    expect(response.closerPeers).to.have.length(1)
    const peer = response.closerPeers[0]

    expect(peer.id.id).to.be.eql(peerIds[1].id)
    expect(peer.multiaddrs).to.be.eql([])
  })

  it('handles no peers found', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 0)
    const response = await handler(dht)(peerIds[2], msg)

    expect(response.closerPeers).to.have.length(0)
  })
})
