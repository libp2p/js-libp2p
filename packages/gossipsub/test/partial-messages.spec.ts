import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import pWaitFor from 'p-wait-for'
import { RPC } from '../src/message/rpc.js'
import { createComponents, connectPubsubNodes } from './utils/create-pubsub.js'
import type { GossipSubAndComponents } from './utils/create-pubsub.js'
import type { PartialMessage, PartialSubscriptionOpts } from '../src/types.js'

async function waitForStreamsReady (a: GossipSubAndComponents, b: GossipSubAndComponents): Promise<void> {
  await pWaitFor(() => {
    const gsA = a.pubsub as any
    const gsB = b.pubsub as any
    const bId = b.components.peerId.toString()
    const aId = a.components.peerId.toString()
    return gsA.peers.has(bId) && gsB.peers.has(aId) &&
      gsA.streamsOutbound.has(bId) && gsB.streamsOutbound.has(aId)
  }, { timeout: 10000 })
}

describe('partial messages', () => {
  let nodeA: GossipSubAndComponents
  let nodeB: GossipSubAndComponents

  beforeEach(async () => {
    nodeA = await createComponents({
      init: {
        emitSelf: false
      }
    })
    nodeB = await createComponents({
      init: {
        emitSelf: false
      }
    })
    await connectPubsubNodes(nodeA, nodeB)
    await waitForStreamsReady(nodeA, nodeB)
  })

  afterEach(async () => {
    await stop(nodeA.pubsub, ...Object.entries(nodeA.components))
    await stop(nodeB.pubsub, ...Object.entries(nodeB.components))
  })

  describe('subscription signaling', () => {
    it('should include partial flags in SubOpts when subscribePartial is called', async () => {
      const topic = 'test-topic'

      nodeA.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      // Verify partialTopics was updated
      const partialOpts = nodeA.pubsub.partialTopics.get(topic)
      expect(partialOpts).to.not.be.undefined()
      expect(partialOpts?.requestsPartial).to.be.true()
      expect(partialOpts?.supportsSendingPartial).to.be.true()

      // Verify the topic was subscribed
      expect(nodeA.pubsub.getTopics()).to.include(topic)
    })

    it('should remove partial flags when unsubscribePartial is called', async () => {
      const topic = 'test-topic'

      nodeA.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      expect(nodeA.pubsub.partialTopics.has(topic)).to.be.true()

      nodeA.pubsub.unsubscribePartial(topic)

      expect(nodeA.pubsub.partialTopics.has(topic)).to.be.false()
    })

    it('should track peer partial opts when receiving subscription with partial flags', async () => {
      const topic = 'test-topic'
      const aId = nodeA.components.peerId.toString()

      // Simulate nodeB receiving an RPC from nodeA with partial subscription flags
      // This tests the handleReceivedRpc path that processes partial SubOpts
      const gsB = nodeB.pubsub as any
      const rpc: RPC = {
        subscriptions: [{
          subscribe: true,
          topic,
          requestsPartial: true,
          supportsSendingPartial: true
        }],
        messages: []
      }

      // Directly call the RPC processing on nodeB
      gsB.handleReceivedRpc(nodeA.components.peerId, rpc)

      // Verify nodeB tracked nodeA's partial opts
      const peerOpts = gsB.peerPartialOpts.get(aId)
      expect(peerOpts).to.not.be.undefined()
      const topicOpts = peerOpts?.get(topic)
      expect(topicOpts?.requestsPartial).to.be.true()
      expect(topicOpts?.supportsSendingPartial).to.be.true()

      // Verify nodeB sees nodeA subscribed
      const subscribers = nodeB.pubsub.getSubscribers(topic)
      expect(subscribers.map(p => p.toString())).to.include(aId)
    })

    it('should remove peer partial opts on unsubscribe', async () => {
      const topic = 'test-topic'
      const aId = nodeA.components.peerId.toString()
      const gsB = nodeB.pubsub as any

      // First subscribe
      gsB.handleReceivedRpc(nodeA.components.peerId, {
        subscriptions: [{
          subscribe: true,
          topic,
          requestsPartial: true,
          supportsSendingPartial: true
        }],
        messages: []
      })

      expect(gsB.peerPartialOpts.get(aId)?.has(topic)).to.be.true()

      // Then unsubscribe
      gsB.handleReceivedRpc(nodeA.components.peerId, {
        subscriptions: [{
          subscribe: false,
          topic,
          requestsPartial: true,
          supportsSendingPartial: true
        }],
        messages: []
      })

      // The topic should be removed from the peer's opts
      expect(gsB.peerPartialOpts.get(aId)?.has(topic)).to.be.false()
    })

    it('should include partial flags in outgoing SubOpts', () => {
      const topic = 'test-topic'
      const gsA = nodeA.pubsub as any

      // Set up partial topic
      nodeA.pubsub.partialTopics.set(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })
      gsA.subscriptions.add(topic)

      // Build the SubOpts like sendSubscriptions does
      const subOpts: RPC.SubOpts = { topic, subscribe: true }
      const partialOpts = nodeA.pubsub.partialTopics.get(topic)
      if (partialOpts != null) {
        subOpts.requestsPartial = partialOpts.requestsPartial
        subOpts.supportsSendingPartial = partialOpts.supportsSendingPartial
      }

      // Verify the SubOpts contain partial flags
      expect(subOpts.requestsPartial).to.be.true()
      expect(subOpts.supportsSendingPartial).to.be.true()

      // Verify encoding preserves the flags
      const encoded = RPC.SubOpts.encode(subOpts)
      const decoded = RPC.SubOpts.decode(encoded)
      expect(decoded.requestsPartial).to.equal(true)
      expect(decoded.supportsSendingPartial).to.equal(true)
    })
  })

  describe('protobuf round-trip', () => {
    it('should encode and decode SubOpts with partial fields', () => {
      const subOpts: RPC.SubOpts = {
        subscribe: true,
        topic: 'test-topic',
        requestsPartial: true,
        supportsSendingPartial: false
      }

      const encoded = RPC.SubOpts.encode(subOpts)
      const decoded = RPC.SubOpts.decode(encoded)

      expect(decoded.subscribe).to.equal(true)
      expect(decoded.topic).to.equal('test-topic')
      expect(decoded.requestsPartial).to.equal(true)
      expect(decoded.supportsSendingPartial).to.equal(false)
    })

    it('should encode and decode ControlExtensions', () => {
      const extensions: RPC.ControlExtensions = {
        partialMessages: true
      }

      const encoded = RPC.ControlExtensions.encode(extensions)
      const decoded = RPC.ControlExtensions.decode(encoded)

      expect(decoded.partialMessages).to.equal(true)
    })

    it('should encode and decode PartialMessagesExtension', () => {
      const partial: RPC.PartialMessagesExtension = {
        topicID: new Uint8Array([1, 2, 3]),
        groupID: new Uint8Array([4, 5, 6]),
        partialMessage: new Uint8Array([7, 8, 9]),
        partsMetadata: new Uint8Array([10, 11, 12])
      }

      const encoded = RPC.PartialMessagesExtension.encode(partial)
      const decoded = RPC.PartialMessagesExtension.decode(encoded)

      expect(decoded.topicID).to.deep.equal(new Uint8Array([1, 2, 3]))
      expect(decoded.groupID).to.deep.equal(new Uint8Array([4, 5, 6]))
      expect(decoded.partialMessage).to.deep.equal(new Uint8Array([7, 8, 9]))
      expect(decoded.partsMetadata).to.deep.equal(new Uint8Array([10, 11, 12]))
    })

    it('should encode and decode RPC with partial field', () => {
      const rpc: RPC = {
        subscriptions: [{
          subscribe: true,
          topic: 'test',
          requestsPartial: true,
          supportsSendingPartial: true
        }],
        messages: [],
        control: {
          ihave: [],
          iwant: [],
          graft: [],
          prune: [],
          idontwant: [],
          extensions: { partialMessages: true }
        },
        partial: {
          topicID: new Uint8Array([1]),
          groupID: new Uint8Array([2]),
          partsMetadata: new Uint8Array([3])
        }
      }

      const encoded = RPC.encode(rpc)
      const decoded = RPC.decode(encoded)

      expect(decoded.subscriptions[0].requestsPartial).to.equal(true)
      expect(decoded.subscriptions[0].supportsSendingPartial).to.equal(true)
      expect(decoded.control?.extensions?.partialMessages).to.equal(true)
      expect(decoded.partial?.topicID).to.deep.equal(new Uint8Array([1]))
      expect(decoded.partial?.groupID).to.deep.equal(new Uint8Array([2]))
      expect(decoded.partial?.partsMetadata).to.deep.equal(new Uint8Array([3]))
    })

    it('should be backward compatible - old format decodes without partial fields', () => {
      const rpc: RPC = {
        subscriptions: [{ subscribe: true, topic: 'test' }],
        messages: []
      }

      const encoded = RPC.encode(rpc)
      const decoded = RPC.decode(encoded)

      expect(decoded.subscriptions[0].requestsPartial).to.be.undefined()
      expect(decoded.subscriptions[0].supportsSendingPartial).to.be.undefined()
      expect(decoded.control).to.be.undefined()
      expect(decoded.partial).to.be.undefined()
    })
  })

  describe('handleReceivedPartial', () => {
    it('should dispatch partial-message event when receiving partial RPC', async () => {
      const topic = 'test-topic'
      const gsB = nodeB.pubsub as any

      // Subscribe nodeB with partial support so it has the state
      nodeB.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      const topicIDBytes = new TextEncoder().encode(topic)

      // Set up listener for the partial-message event
      const received = new Promise<PartialMessage>((resolve) => {
        nodeB.pubsub.addEventListener('gossipsub:partial-message', (evt: CustomEvent<PartialMessage>) => {
          resolve(evt.detail)
        }, { once: true })
      })

      // Simulate receiving a partial RPC from nodeA
      const partialRpc: RPC = {
        subscriptions: [],
        messages: [],
        partial: {
          topicID: topicIDBytes,
          groupID: new Uint8Array([1, 2, 3]),
          partialMessage: new Uint8Array([4, 5, 6]),
          partsMetadata: new Uint8Array([0b1010])
        }
      }

      gsB.handleReceivedRpc(nodeA.components.peerId, partialRpc)

      const msg = await received
      expect(msg.topic).to.equal(topic)
      expect(msg.groupID).to.deep.equal(new Uint8Array([1, 2, 3]))
      expect(msg.partsMetadata).to.deep.equal(new Uint8Array([0b1010]))
    })

    it('should update PartialMessageState when receiving partial RPC', async () => {
      const topic = 'test-topic'
      const gsB = nodeB.pubsub as any

      // Subscribe nodeB with partial support
      nodeB.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      const topicIDBytes = new TextEncoder().encode(topic)

      // Simulate receiving a partial RPC
      gsB.handleReceivedRpc(nodeA.components.peerId, {
        subscriptions: [],
        messages: [],
        partial: {
          topicID: topicIDBytes,
          groupID: new Uint8Array([1, 2]),
          partsMetadata: new Uint8Array([0b1010])
        }
      })

      // Verify the PartialMessageState was updated
      const state = gsB.partialMessageState.get(topic)
      expect(state).to.not.be.undefined()
      expect(state.hasGroup(new Uint8Array([1, 2]))).to.be.true()
      expect(state.getLocalMetadata(new Uint8Array([1, 2]))).to.deep.equal(new Uint8Array([0b1010]))
    })

    it('should reject partial messages with missing required fields', async () => {
      const gsB = nodeB.pubsub as any

      // No topic subscribed, but also missing required fields
      const partialRpc: RPC = {
        subscriptions: [],
        messages: [],
        partial: {
          // Missing topicID
          groupID: new Uint8Array([1, 2]),
          partsMetadata: new Uint8Array([0b1010])
        }
      }

      // Should not throw, just silently return
      gsB.handleReceivedRpc(nodeA.components.peerId, partialRpc)

      // No state should be created
      expect(gsB.partialMessageState.size).to.equal(0)
    })
  })

  describe('publishPartial', () => {
    it('should update local PartialMessageState', () => {
      const topic = 'test-topic'
      const gsA = nodeA.pubsub as any

      // Subscribe nodeA with partial support
      nodeA.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      nodeA.pubsub.publishPartial({
        topic,
        groupID: new Uint8Array([1, 2, 3]),
        partialMessage: new Uint8Array([4, 5, 6]),
        partsMetadata: new Uint8Array([0b1010])
      })

      // Verify local state was updated
      const state = gsA.partialMessageState.get(topic)
      expect(state).to.not.be.undefined()
      expect(state.hasGroup(new Uint8Array([1, 2, 3]))).to.be.true()
    })

    it('should send partial RPC to peers with requestsPartial', () => {
      const topic = 'test-topic'
      const bId = nodeB.components.peerId.toString()
      const gsA = nodeA.pubsub as any

      // Subscribe nodeA
      nodeA.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      // Add nodeB to the topic's peer set
      if (!gsA.topics.has(topic)) {
        gsA.topics.set(topic, new Set())
      }
      gsA.topics.get(topic).add(bId)

      // Set nodeB's partial opts indicating it requests partial messages
      gsA.peerPartialOpts.set(bId, new Map())
      gsA.peerPartialOpts.get(bId).set(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      } as PartialSubscriptionOpts)

      // Spy on sendRpc to capture what gets sent
      const sentRpcs: Array<{ peerId: string, rpc: RPC }> = []
      const origSendRpc = gsA.sendRpc.bind(gsA)
      gsA.sendRpc = (id: string, rpc: RPC): boolean => {
        sentRpcs.push({ peerId: id, rpc })
        return origSendRpc(id, rpc)
      }

      // Publish partial from nodeA
      nodeA.pubsub.publishPartial({
        topic,
        groupID: new Uint8Array([1, 2, 3]),
        partialMessage: new Uint8Array([4, 5, 6]),
        partsMetadata: new Uint8Array([0b1010])
      })

      // Verify the partial RPC was sent to nodeB
      const sentToB = sentRpcs.find(s => s.peerId === bId)
      expect(sentToB).to.not.be.undefined()
      expect(sentToB?.rpc.partial).to.not.be.undefined()
      expect(sentToB?.rpc.partial?.topicID).to.deep.equal(new TextEncoder().encode(topic))
      expect(sentToB?.rpc.partial?.groupID).to.deep.equal(new Uint8Array([1, 2, 3]))
      expect(sentToB?.rpc.partial?.partialMessage).to.deep.equal(new Uint8Array([4, 5, 6]))
      expect(sentToB?.rpc.partial?.partsMetadata).to.deep.equal(new Uint8Array([0b1010]))
    })

    it('should send metadata-only to peers with supportsSendingPartial but not requestsPartial', () => {
      const topic = 'test-topic'
      const bId = nodeB.components.peerId.toString()
      const gsA = nodeA.pubsub as any

      // Subscribe nodeA
      nodeA.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      // Add nodeB to the topic's peer set
      if (!gsA.topics.has(topic)) {
        gsA.topics.set(topic, new Set())
      }
      gsA.topics.get(topic).add(bId)

      // Set nodeB as supporting sending but NOT requesting partial
      gsA.peerPartialOpts.set(bId, new Map())
      gsA.peerPartialOpts.get(bId).set(topic, {
        requestsPartial: false,
        supportsSendingPartial: true
      } as PartialSubscriptionOpts)

      // Spy on sendRpc
      const sentRpcs: Array<{ peerId: string, rpc: RPC }> = []
      const origSendRpc = gsA.sendRpc.bind(gsA)
      gsA.sendRpc = (id: string, rpc: RPC): boolean => {
        sentRpcs.push({ peerId: id, rpc })
        return origSendRpc(id, rpc)
      }

      // Publish partial
      nodeA.pubsub.publishPartial({
        topic,
        groupID: new Uint8Array([1, 2, 3]),
        partialMessage: new Uint8Array([4, 5, 6]),
        partsMetadata: new Uint8Array([0b1010])
      })

      // Verify metadata-only partial was sent (no partialMessage field)
      const sentToB = sentRpcs.find(s => s.peerId === bId)
      expect(sentToB).to.not.be.undefined()
      expect(sentToB?.rpc.partial).to.not.be.undefined()
      expect(sentToB?.rpc.partial?.partsMetadata).to.deep.equal(new Uint8Array([0b1010]))
      expect(sentToB?.rpc.partial?.partialMessage).to.be.undefined()
    })
  })

  describe('cleanup', () => {
    it('should clean up partial state when unsubscribePartial is called', () => {
      const topic = 'test-topic'

      nodeA.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      // Verify state exists
      const gsA = nodeA.pubsub as any
      expect(gsA.partialMessageState.has(topic)).to.be.true()
      expect(nodeA.pubsub.partialTopics.has(topic)).to.be.true()

      nodeA.pubsub.unsubscribePartial(topic)

      // Verify state cleaned up
      expect(gsA.partialMessageState.has(topic)).to.be.false()
      expect(nodeA.pubsub.partialTopics.has(topic)).to.be.false()
    })

    it('should clean up peer partial opts when peer is removed', () => {
      const peerAId = nodeA.components.peerId.toString()
      const gsB = nodeB.pubsub as any

      // Manually set peer opts to verify they get cleaned up
      gsB.peerPartialOpts.set(peerAId, new Map())
      gsB.peerPartialOpts.get(peerAId).set('test-topic', {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      expect(gsB.peerPartialOpts.has(peerAId)).to.be.true()

      // Directly trigger removePeer (simulates disconnect)
      gsB.removePeer(nodeA.components.peerId)

      // After peer removal, partial opts should be cleaned
      expect(gsB.peerPartialOpts.has(peerAId)).to.be.false()
    })

    it('should clean up sentExtensions when peer is removed', () => {
      const peerAId = nodeA.components.peerId.toString()
      const gsB = nodeB.pubsub as any

      // Manually set sentExtensions
      gsB.sentExtensions.add(peerAId)
      expect(gsB.sentExtensions.has(peerAId)).to.be.true()

      // Directly trigger removePeer
      gsB.removePeer(nodeA.components.peerId)

      expect(gsB.sentExtensions.has(peerAId)).to.be.false()
    })

    it('should clean up partialMessageState peer entries when peer is removed', () => {
      const topic = 'test-topic'
      const peerAId = nodeA.components.peerId.toString()
      const gsB = nodeB.pubsub as any

      // Subscribe nodeB with partial support
      nodeB.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      // Simulate having received partial metadata from nodeA
      const state = gsB.partialMessageState.get(topic)
      state.updateMetadata(new Uint8Array([1]), peerAId, new Uint8Array([0b1010]))
      expect(state.getPeerMetadata(new Uint8Array([1]), peerAId)).to.not.be.undefined()

      // Directly trigger removePeer
      gsB.removePeer(nodeA.components.peerId)

      // Peer metadata should be cleaned up
      expect(state.getPeerMetadata(new Uint8Array([1]), peerAId)).to.be.undefined()
    })
  })
})
