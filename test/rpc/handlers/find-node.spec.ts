/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { Message, MESSAGE_TYPE } from '../../../src/message/index.js'
import { FindNodeHandler } from '../../../src/rpc/handlers/find-node.js'
import { Multiaddr } from '@multiformats/multiaddr'
import { createPeerId } from '../../utils/create-peer-id.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { DHTMessageHandler } from '../../../src/rpc/index.js'
import { PeerRouting } from '../../../src/peer-routing/index.js'
import Sinon, { SinonStubbedInstance } from 'sinon'

const T = MESSAGE_TYPE.FIND_NODE

describe('rpc - handlers - FindNode', () => {
  let peerId: PeerId
  let sourcePeer: PeerId
  let targetPeer: PeerId
  let handler: DHTMessageHandler
  let peerRouting: SinonStubbedInstance<PeerRouting>

  beforeEach(async () => {
    peerId = await createPeerId()
    sourcePeer = await createPeerId()
    targetPeer = await createPeerId()
    peerRouting = Sinon.createStubInstance(PeerRouting)

    handler = new FindNodeHandler({
      peerRouting,
      lan: false
    })
  })

  it('returns self, if asked for self', async () => {
    const msg = new Message(T, peerId.multihash.bytes, 0)

    const response = await handler.handle(peerId, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response.closerPeers).to.have.length(1)
    const peer = response.closerPeers[0]

    expect(peer.id).to.be.eql(peerId)
  })

  it('returns closer peers', async () => {
    const msg = new Message(T, targetPeer.multihash.bytes, 0)

    peerRouting.getCloserPeersOffline
      .withArgs(targetPeer.multihash.bytes, peerId)
      .resolves([{
        id: targetPeer,
        multiaddrs: [
          new Multiaddr('/ip4/127.0.0.1/tcp/4002'),
          new Multiaddr('/ip4/192.168.1.5/tcp/4002'),
          new Multiaddr('/ip4/221.4.67.0/tcp/4002')
        ],
        protocols: []
      }])

    const response = await handler.handle(sourcePeer, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response.closerPeers).to.have.length(1)
    const peer = response.closerPeers[0]

    expect(peer.id).to.be.eql(targetPeer)
    expect(peer.multiaddrs).to.not.be.empty()
  })

  it('handles no peers found', async () => {
    const msg = new Message(T, targetPeer.multihash.bytes, 0)
    const response = await handler.handle(sourcePeer, msg)

    expect(response).to.have.property('closerPeers').that.is.empty()
  })

  it('returns only lan addresses', async () => {
    const msg = new Message(T, targetPeer.multihash.bytes, 0)

    peerRouting.getCloserPeersOffline
      .withArgs(targetPeer.multihash.bytes, peerId)
      .resolves([{
        id: targetPeer,
        multiaddrs: [
          new Multiaddr('/ip4/127.0.0.1/tcp/4002'),
          new Multiaddr('/ip4/192.168.1.5/tcp/4002'),
          new Multiaddr('/ip4/221.4.67.0/tcp/4002')
        ],
        protocols: []
      }])

    handler = new FindNodeHandler({
      peerRouting,
      lan: true
    })

    const response = await handler.handle(sourcePeer, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response.closerPeers).to.have.length(1)
    const peer = response.closerPeers[0]

    expect(peer.id).to.be.eql(targetPeer)
    expect(peer.multiaddrs.map(ma => ma.toString())).to.include('/ip4/192.168.1.5/tcp/4002')
    expect(peer.multiaddrs.map(ma => ma.toString())).to.not.include('/ip4/221.4.67.0/tcp/4002')
  })

  it('returns only wan addresses', async () => {
    const msg = new Message(T, targetPeer.multihash.bytes, 0)

    peerRouting.getCloserPeersOffline
      .withArgs(targetPeer.multihash.bytes, peerId)
      .resolves([{
        id: targetPeer,
        multiaddrs: [
          new Multiaddr('/ip4/127.0.0.1/tcp/4002'),
          new Multiaddr('/ip4/192.168.1.5/tcp/4002'),
          new Multiaddr('/ip4/221.4.67.0/tcp/4002')
        ],
        protocols: []
      }])

    const response = await handler.handle(sourcePeer, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response.closerPeers).to.have.length(1)
    const peer = response.closerPeers[0]

    expect(peer.id).to.be.eql(targetPeer)
    expect(peer.multiaddrs.map(ma => ma.toString())).to.not.include('/ip4/192.168.1.5/tcp/4002')
    expect(peer.multiaddrs.map(ma => ma.toString())).to.include('/ip4/221.4.67.0/tcp/4002')
  })
})
