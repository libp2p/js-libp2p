/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { Message } = require('../../../src/message')
const { FindNodeHandler } = require('../../../src/rpc/handlers/find-node')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { Multiaddr } = require('multiaddr')

const T = Message.TYPES.FIND_NODE

const createPeerId = require('../../utils/create-peer-id')
const TestDHT = require('../../utils/test-dht')

describe('rpc - handlers - FindNode', () => {
  let peerIds
  let tdht
  let dht
  let handler

  before(async () => {
    tdht = new TestDHT()
    peerIds = await createPeerId(3)
  })

  beforeEach(async () => {
    [dht] = await tdht.spawn(1)

    handler = new FindNodeHandler({
      peerId: dht._libp2p.peerId,
      addressable: dht._libp2p,
      peerRouting: dht._lan._peerRouting
    })
  })

  afterEach(() => tdht.teardown())

  it('returns self, if asked for self', async () => {
    const msg = new Message(T, dht._libp2p.peerId.id, 0)

    const response = await handler.handle(peerIds[1], msg)

    expect(response.closerPeers).to.have.length(1)
    const peer = response.closerPeers[0]

    expect(peer.id.id).to.be.eql(dht._libp2p.peerId.id)
  })

  it('returns closer peers', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 0)
    const other = peerIds[1]

    await dht._lan._routingTable.add(other)
    await dht._libp2p.peerStore.addressBook.set(other, [
      new Multiaddr('/ip4/127.0.0.1/tcp/4002'),
      new Multiaddr('/ip4/192.168.1.5/tcp/4002'),
      new Multiaddr('/ip4/221.4.67.0/tcp/4002')
    ])
    const response = await handler.handle(peerIds[2].id, msg)

    expect(response.closerPeers).to.have.length(1)
    const peer = response.closerPeers[0]

    expect(peer.id.id).to.be.eql(peerIds[1].id)
    expect(peer.multiaddrs).to.not.be.empty()
  })

  it('handles no peers found', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 0)
    const response = await handler.handle(peerIds[2], msg)

    expect(response.closerPeers).to.have.length(0)
  })

  it('returns only lan addresses', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 0)
    const other = peerIds[1]

    await dht._lan._routingTable.add(other)
    await dht._libp2p.peerStore.addressBook.set(other, [
      new Multiaddr('/ip4/127.0.0.1/tcp/4002'),
      new Multiaddr('/ip4/192.168.1.5/tcp/4002'),
      new Multiaddr('/ip4/221.4.67.0/tcp/4002')
    ])

    handler = new FindNodeHandler({
      peerId: dht._libp2p.peerId,
      addressable: dht._libp2p,
      peerRouting: dht._lan._peerRouting,
      lan: true
    })
    const response = await handler.handle(peerIds[2].id, msg)

    expect(response.closerPeers).to.have.length(1)
    const peer = response.closerPeers[0]

    expect(peer.id.id).to.be.eql(peerIds[1].id)
    expect(peer.multiaddrs.map(ma => ma.toString())).to.include('/ip4/192.168.1.5/tcp/4002')
    expect(peer.multiaddrs.map(ma => ma.toString())).to.not.include('/ip4/221.4.67.0/tcp/4002')
  })

  it('returns only wan addresses', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 0)
    const other = peerIds[1]

    await dht._lan._routingTable.add(other)
    await dht._libp2p.peerStore.addressBook.set(other, [
      new Multiaddr('/ip4/127.0.0.1/tcp/4002'),
      new Multiaddr('/ip4/192.168.1.5/tcp/4002'),
      new Multiaddr('/ip4/221.4.67.0/tcp/4002')
    ])

    handler = new FindNodeHandler({
      peerId: dht._libp2p.peerId,
      addressable: dht._libp2p,
      peerRouting: dht._lan._peerRouting,
      lan: false
    })
    const response = await handler.handle(peerIds[2].id, msg)

    expect(response.closerPeers).to.have.length(1)
    const peer = response.closerPeers[0]

    expect(peer.id.id).to.be.eql(peerIds[1].id)
    expect(peer.multiaddrs.map(ma => ma.toString())).to.not.include('/ip4/192.168.1.5/tcp/4002')
    expect(peer.multiaddrs.map(ma => ma.toString())).to.include('/ip4/221.4.67.0/tcp/4002')
  })
})
