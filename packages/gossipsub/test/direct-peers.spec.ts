import { stop } from '@libp2p/interface'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { createComponents } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'
import type { ConnectionManager } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

describe('dynamic direct peer management', () => {
  let node: GossipSubAndComponents

  beforeEach(async () => {
    node = await createComponents({})
  })

  afterEach(async () => {
    await stop(node.pubsub, ...Object.entries(node.components))
  })

  // ======== addDirectPeer ========

  describe('addDirectPeer', () => {
    it('should add peer to direct set and store its addresses', async () => {
      const remoteKey = await generateKeyPair('Ed25519')
      const remotePeer = peerIdFromPrivateKey(remoteKey)
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      const result = await node.pubsub.addDirectPeer(remotePeer, [addr])

      expect(result).to.equal(remotePeer.toString())
      expect(node.pubsub.direct.has(remotePeer.toString())).to.be.true

      const stored = await node.components.peerStore.get(remotePeer)
      expect(stored.addresses.some(a => a.multiaddr.toString() === '/ip4/127.0.0.1/tcp/9000')).to.be.true
    })

    it('should attempt to connect when gossipsub is running', async () => {
      const remoteKey = await generateKeyPair('Ed25519')
      const remotePeer = peerIdFromPrivateKey(remoteKey)
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      await node.pubsub.addDirectPeer(remotePeer, [addr])

      const cm = node.components.connectionManager as unknown as StubbedInstance<ConnectionManager>
      expect(cm.openConnection.called).to.be.true
    })

    it('should return null when adding self as a direct peer', async () => {
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      const result = await node.pubsub.addDirectPeer(node.components.peerId, [addr])

      expect(result).to.be.null
      expect(node.pubsub.direct.has(node.components.peerId.toString())).to.be.false
    })

    it('should return null when no addresses are provided', async () => {
      const remoteKey = await generateKeyPair('Ed25519')
      const remotePeer = peerIdFromPrivateKey(remoteKey)

      const result = await node.pubsub.addDirectPeer(remotePeer, [])

      expect(result).to.be.null
      expect(node.pubsub.direct.has(remotePeer.toString())).to.be.false
    })

    it('should not call connect when gossipsub is stopped', async () => {
      await node.pubsub.stop()

      const remoteKey = await generateKeyPair('Ed25519')
      const remotePeer = peerIdFromPrivateKey(remoteKey)
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      const result = await node.pubsub.addDirectPeer(remotePeer, [addr])

      const cm = node.components.connectionManager as unknown as StubbedInstance<ConnectionManager>
      expect(result).to.equal(remotePeer.toString())
      expect(node.pubsub.direct.has(remotePeer.toString())).to.be.true
      expect(cm.openConnection.called).to.be.false
    })
  })

  // ======== removeDirectPeer ========

  describe('removeDirectPeer', () => {
    it('should remove an existing direct peer and return true', async () => {
      const remoteKey = await generateKeyPair('Ed25519')
      const remotePeer = peerIdFromPrivateKey(remoteKey)
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      await node.pubsub.addDirectPeer(remotePeer, [addr])

      const result = node.pubsub.removeDirectPeer(remotePeer)

      expect(result).to.be.true
      expect(node.pubsub.direct.has(remotePeer.toString())).to.be.false
    })

    it('should accept a peer ID string as argument', async () => {
      const remoteKey = await generateKeyPair('Ed25519')
      const remotePeer = peerIdFromPrivateKey(remoteKey)
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      await node.pubsub.addDirectPeer(remotePeer, [addr])

      const result = node.pubsub.removeDirectPeer(remotePeer.toString())

      expect(result).to.be.true
      expect(node.pubsub.direct.has(remotePeer.toString())).to.be.false
    })

    it('should return false when peer is not in the direct set', () => {
      const result = node.pubsub.removeDirectPeer('12D3KooWFvQ9JMBTNLwt7Q9BS3HbNrPB4rBi6h9bHNMNGbRpVME4')

      expect(result).to.be.false
    })
  })

  // ======== getDirectPeers ========

  describe('getDirectPeers', () => {
    it('should return all current direct peer ID strings', async () => {
      const key1 = await generateKeyPair('Ed25519')
      const key2 = await generateKeyPair('Ed25519')
      const peer1 = peerIdFromPrivateKey(key1)
      const peer2 = peerIdFromPrivateKey(key2)
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      await node.pubsub.addDirectPeer(peer1, [addr])
      await node.pubsub.addDirectPeer(peer2, [addr])

      const directPeers = node.pubsub.getDirectPeers()

      expect(directPeers).to.include(peer1.toString())
      expect(directPeers).to.include(peer2.toString())
      expect(directPeers).to.have.lengthOf(2)
    })

    it('should reflect removals performed via removeDirectPeer', async () => {
      const key1 = await generateKeyPair('Ed25519')
      const key2 = await generateKeyPair('Ed25519')
      const peer1 = peerIdFromPrivateKey(key1)
      const peer2 = peerIdFromPrivateKey(key2)
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      await node.pubsub.addDirectPeer(peer1, [addr])
      await node.pubsub.addDirectPeer(peer2, [addr])
      node.pubsub.removeDirectPeer(peer1)

      const directPeers = node.pubsub.getDirectPeers()

      expect(directPeers).to.not.include(peer1.toString())
      expect(directPeers).to.include(peer2.toString())
      expect(directPeers).to.have.lengthOf(1)
    })
  })
})
