import { generateKeyPair } from '@libp2p/crypto/keys'
import { stop } from '@libp2p/interface'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { createComponents } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'

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

      await node.pubsub.addDirectPeer(remotePeer, [addr])

      expect(node.pubsub.direct.has(remotePeer.toString())).to.equal(true)

      const stored = await node.components.peerStore.get(remotePeer)
      expect(stored.addresses.some(a => a.multiaddr.toString() === '/ip4/127.0.0.1/tcp/9000')).to.equal(true)
    })

    it('should add peer to direct set when gossipsub is running', async () => {
      const remoteKey = await generateKeyPair('Ed25519')
      const remotePeer = peerIdFromPrivateKey(remoteKey)
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      await node.pubsub.addDirectPeer(remotePeer, [addr])

      // Peer is added and a connection attempt fires. Connect errors are caught internally.
      expect(node.pubsub.direct.has(remotePeer.toString())).to.equal(true)
      expect(node.pubsub.isStarted()).to.equal(true)
    })

    it('should reject when adding self as a direct peer', async () => {
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      await expectRejects(
        node.pubsub.addDirectPeer(node.components.peerId, [addr]),
        'Cannot add self as a direct peer'
      )

      expect(node.pubsub.direct.has(node.components.peerId.toString())).to.equal(false)
    })

    it('should reject when no addresses are provided', async () => {
      const remoteKey = await generateKeyPair('Ed25519')
      const remotePeer = peerIdFromPrivateKey(remoteKey)

      await expectRejects(
        node.pubsub.addDirectPeer(remotePeer, []),
        'Direct peer addresses are required'
      )

      expect(node.pubsub.direct.has(remotePeer.toString())).to.equal(false)
    })

    it('should propagate peer store failures', async () => {
      const remoteKey = await generateKeyPair('Ed25519')
      const remotePeer = peerIdFromPrivateKey(remoteKey)
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')
      const error = new Error('peer store failed')
      const mergeStub = sinon.stub(node.components.peerStore, 'merge').rejects(error)

      try {
        await expectRejects(node.pubsub.addDirectPeer(remotePeer, [addr]), 'peer store failed')
      } finally {
        mergeStub.restore()
      }

      expect(node.pubsub.direct.has(remotePeer.toString())).to.equal(false)
    })

    it('should still add peer to direct set when gossipsub is stopped', async () => {
      await node.pubsub.stop()

      const remoteKey = await generateKeyPair('Ed25519')
      const remotePeer = peerIdFromPrivateKey(remoteKey)
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      await node.pubsub.addDirectPeer(remotePeer, [addr])

      expect(node.pubsub.direct.has(remotePeer.toString())).to.equal(true)
      // gossipsub is stopped, no connection attempt
      expect(node.pubsub.isStarted()).to.equal(false)
    })

    it('should remove promoted peers from mesh and fanout sets', async () => {
      const remoteKey = await generateKeyPair('Ed25519')
      const remotePeer = peerIdFromPrivateKey(remoteKey)
      const remotePeerStr = remotePeer.toString()
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      node.pubsub.mesh.set('mesh-topic', new Set([remotePeerStr]))
      node.pubsub.fanout.set('fanout-topic', new Set([remotePeerStr]))

      await node.pubsub.addDirectPeer(remotePeer, [addr])

      expect(node.pubsub.direct.has(remotePeerStr)).to.equal(true)
      expect(node.pubsub.mesh.get('mesh-topic')?.has(remotePeerStr)).to.equal(false)
      expect(node.pubsub.fanout.get('fanout-topic')?.has(remotePeerStr)).to.equal(false)
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

      expect(result).to.equal(true)
      expect(node.pubsub.direct.has(remotePeer.toString())).to.equal(false)
    })

    it('should accept a peer ID string as argument', async () => {
      const remoteKey = await generateKeyPair('Ed25519')
      const remotePeer = peerIdFromPrivateKey(remoteKey)
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      await node.pubsub.addDirectPeer(remotePeer, [addr])

      const result = node.pubsub.removeDirectPeer(remotePeer.toString())

      expect(result).to.equal(true)
      expect(node.pubsub.direct.has(remotePeer.toString())).to.equal(false)
    })

    it('should return false when peer is not in the direct set', () => {
      const result = node.pubsub.removeDirectPeer('12D3KooWFvQ9JMBTNLwt7Q9BS3HbNrPB4rBi6h9bHNMNGbRpVME4')

      expect(result).to.equal(false)
    })
  })

  // ======== getDirectPeers ========

  describe('getDirectPeers', () => {
    it('should return all current direct peers', async () => {
      const key1 = await generateKeyPair('Ed25519')
      const key2 = await generateKeyPair('Ed25519')
      const peer1 = peerIdFromPrivateKey(key1)
      const peer2 = peerIdFromPrivateKey(key2)
      const addr = multiaddr('/ip4/127.0.0.1/tcp/9000')

      await node.pubsub.addDirectPeer(peer1, [addr])
      await node.pubsub.addDirectPeer(peer2, [addr])

      const directPeers = node.pubsub.getDirectPeers()

      expect(directPeers.map(peer => peer.toString())).to.include(peer1.toString())
      expect(directPeers.map(peer => peer.toString())).to.include(peer2.toString())
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

      expect(directPeers.map(peer => peer.toString())).to.not.include(peer1.toString())
      expect(directPeers.map(peer => peer.toString())).to.include(peer2.toString())
      expect(directPeers).to.have.lengthOf(1)
    })
  })

  describe('directConnect', () => {
    it('should continue connecting direct peers when one connection fails', async () => {
      const key1 = await generateKeyPair('Ed25519')
      const key2 = await generateKeyPair('Ed25519')
      const peer1 = peerIdFromPrivateKey(key1).toString()
      const peer2 = peerIdFromPrivateKey(key2).toString()
      const error = new Error('connection failed')
      const connectStub = sinon.stub(node.pubsub as any, 'connect')
        .callsFake(async (peer) => {
          if (peer === peer1) {
            throw error
          }
        })

      node.pubsub.direct.add(peer1)
      node.pubsub.direct.add(peer2)

      try {
        await (node.pubsub as any).directConnect()
      } finally {
        connectStub.restore()
      }

      expect(connectStub.calledWith(peer1)).to.equal(true)
      expect(connectStub.calledWith(peer2)).to.equal(true)
    })
  })
})

async function expectRejects (promise: Promise<unknown>, message: string): Promise<void> {
  try {
    await promise
  } catch (err) {
    expect(err).to.be.instanceOf(Error)
    expect((err as Error).message).to.equal(message)
    return
  }

  throw new Error('Expected promise to reject')
}
