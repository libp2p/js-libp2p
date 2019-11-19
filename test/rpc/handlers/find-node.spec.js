/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const Message = require('../../../src/message')
const handler = require('../../../src/rpc/handlers/find-node')

const T = Message.TYPES.FIND_NODE

const createPeerInfo = require('../../utils/create-peer-info')
const TestDHT = require('../../utils/test-dht')

describe('rpc - handlers - FindNode', () => {
  let peers
  let tdht
  let dht

  before(async () => {
    peers = await createPeerInfo(3)
  })

  beforeEach(async () => {
    tdht = new TestDHT()

    const dhts = await tdht.spawn(1)
    dht = dhts[0]
  })

  afterEach(() => tdht.teardown())

  it('returns self, if asked for self', async () => {
    const msg = new Message(T, dht.peerInfo.id.id, 0)

    const response = await handler(dht)(peers[1], msg)

    expect(response.closerPeers).to.have.length(1)
    const peer = response.closerPeers[0]

    expect(peer.id.id).to.be.eql(dht.peerInfo.id.id)
  })

  it('returns closer peers', async () => {
    const msg = new Message(T, Buffer.from('hello'), 0)
    const other = peers[1]

    await dht._add(other)
    const response = await handler(dht)(peers[2], msg)

    expect(response.closerPeers).to.have.length(1)
    const peer = response.closerPeers[0]

    expect(peer.id.id).to.be.eql(peers[1].id.id)
    expect(
      peer.multiaddrs.toArray()
    ).to.be.eql(
      peers[1].multiaddrs.toArray()
    )
  })

  it('handles no peers found', async () => {
    const msg = new Message(T, Buffer.from('hello'), 0)
    const response = await handler(dht)(peers[2], msg)

    expect(response.closerPeers).to.have.length(0)
  })
})
