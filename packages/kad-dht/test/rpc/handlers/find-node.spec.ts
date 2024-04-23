/* eslint-env mocha */

import { defaultLogger } from '@libp2p/logger'
import { peerIdFromBytes } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon, { type SinonStubbedInstance } from 'sinon'
import { type Message, MessageType } from '../../../src/message/dht.js'
import { PeerRouting } from '../../../src/peer-routing/index.js'
import { FindNodeHandler } from '../../../src/rpc/handlers/find-node.js'
import { passthroughMapper, removePrivateAddressesMapper, removePublicAddressesMapper } from '../../../src/utils.js'
import { createPeerId } from '../../utils/create-peer-id.js'
import type { DHTMessageHandler } from '../../../src/rpc/index.js'
import type { PeerId } from '@libp2p/interface'

const T = MessageType.FIND_NODE

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
      peerId,
      logger: defaultLogger()
    }, {
      peerRouting,
      logPrefix: '',
      peerInfoMapper: passthroughMapper
    })
  })

  it('returns nodes close to self but not self, if asked for self', async () => {
    const msg: Message = {
      type: T,
      key: peerId.multihash.bytes,
      closer: [],
      providers: []
    }

    peerRouting.getCloserPeersOffline
      .withArgs(peerId.multihash.bytes, peerId)
      .resolves([{
        id: targetPeer, // closer peer
        multiaddrs: [
          multiaddr('/ip4/127.0.0.1/tcp/4002'),
          multiaddr('/ip4/192.168.1.5/tcp/4002'),
          multiaddr('/ip4/221.4.67.0/tcp/4002')
        ]
      }, {
        id: peerId, // self peer
        multiaddrs: [
          multiaddr('/ip4/127.0.0.1/tcp/4002'),
          multiaddr('/ip4/192.168.1.5/tcp/4002'),
          multiaddr('/ip4/221.4.67.0/tcp/4002')
        ]
      }])

    const response = await handler.handle(peerId, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response.closer).to.have.length(1)
    const peer = response.closer[0]

    expect(peerIdFromBytes(peer.id).toString()).to.equal(targetPeer.toString())
    expect(peer.multiaddrs).to.not.be.empty()
  })

  it('returns closer peers', async () => {
    const msg: Message = {
      type: T,
      key: targetPeer.multihash.bytes,
      closer: [],
      providers: []
    }

    peerRouting.getCloserPeersOffline
      .withArgs(targetPeer.multihash.bytes, sourcePeer)
      .resolves([{
        id: targetPeer,
        multiaddrs: [
          multiaddr('/ip4/127.0.0.1/tcp/4002'),
          multiaddr('/ip4/192.168.1.5/tcp/4002'),
          multiaddr('/ip4/221.4.67.0/tcp/4002')
        ]
      }])

    const response = await handler.handle(sourcePeer, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response.closer).to.have.length(1)
    const peer = response.closer[0]

    expect(peerIdFromBytes(peer.id).toString()).to.equal(targetPeer.toString())
    expect(peer.multiaddrs).to.not.be.empty()
  })

  it('handles no peers found', async () => {
    const msg: Message = {
      type: T,
      key: targetPeer.multihash.bytes,
      closer: [],
      providers: []
    }

    peerRouting.getCloserPeersOffline.resolves([])

    const response = await handler.handle(sourcePeer, msg)

    expect(response).to.have.property('closer').that.is.empty()
  })

  it('returns only lan addresses', async () => {
    const msg: Message = {
      type: T,
      key: targetPeer.multihash.bytes,
      closer: [],
      providers: []
    }

    peerRouting.getCloserPeersOffline
      .withArgs(targetPeer.multihash.bytes, sourcePeer)
      .resolves([{
        id: targetPeer,
        multiaddrs: [
          multiaddr('/ip4/127.0.0.1/tcp/4002'),
          multiaddr('/ip4/192.168.1.5/tcp/4002'),
          multiaddr('/ip4/221.4.67.0/tcp/4002')
        ]
      }])

    handler = new FindNodeHandler({
      peerId,
      logger: defaultLogger()
    }, {
      peerRouting,
      logPrefix: '',
      peerInfoMapper: removePublicAddressesMapper
    })

    const response = await handler.handle(sourcePeer, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response.closer).to.have.length(1)
    const peer = response.closer[0]

    expect(peerIdFromBytes(peer.id).toString()).to.equal(targetPeer.toString())
    expect(peer.multiaddrs.map(ma => multiaddr(ma).toString())).to.include('/ip4/192.168.1.5/tcp/4002')
    expect(peer.multiaddrs.map(ma => multiaddr(ma).toString())).to.not.include('/ip4/221.4.67.0/tcp/4002')
  })

  it('returns only wan addresses', async () => {
    const msg: Message = {
      type: T,
      key: targetPeer.multihash.bytes,
      closer: [],
      providers: []
    }

    peerRouting.getCloserPeersOffline
      .withArgs(targetPeer.multihash.bytes, sourcePeer)
      .resolves([{
        id: targetPeer,
        multiaddrs: [
          multiaddr('/ip4/127.0.0.1/tcp/4002'),
          multiaddr('/ip4/192.168.1.5/tcp/4002'),
          multiaddr('/ip4/221.4.67.0/tcp/4002')
        ]
      }])

    handler = new FindNodeHandler({
      peerId,
      logger: defaultLogger()
    }, {
      peerRouting,
      logPrefix: '',
      peerInfoMapper: removePrivateAddressesMapper
    })

    const response = await handler.handle(sourcePeer, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response.closer).to.have.length(1)
    const peer = response.closer[0]

    expect(peerIdFromBytes(peer.id).toString()).to.equal(targetPeer.toString())
    expect(peer.multiaddrs.map(ma => multiaddr(ma).toString())).to.not.include('/ip4/192.168.1.5/tcp/4002')
    expect(peer.multiaddrs.map(ma => multiaddr(ma).toString())).to.include('/ip4/221.4.67.0/tcp/4002')
  })
})
