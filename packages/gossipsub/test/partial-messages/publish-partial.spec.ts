import { expect } from 'aegir/chai'
import { RPC } from '../../src/message/rpc.js'
import { setupTwoNodes, teardownTwoNodes } from './utils.js'
import type { TwoNodeContext } from './utils.js'
import type { PartialSubscriptionOpts } from '../../src/types.js'

describe('partial messages - publishPartial', () => {
  let ctx: TwoNodeContext

  beforeEach(async () => {
    ctx = await setupTwoNodes()
  })

  afterEach(async () => {
    await teardownTwoNodes(ctx)
  })

  it('should update local PartialMessageState', () => {
    const topic = 'test-topic'
    const gsA = ctx.nodeA.pubsub as any

    // Subscribe nodeA with partial support
    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    ctx.nodeA.pubsub.publishPartial({
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
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    // Subscribe nodeA
    ctx.nodeA.pubsub.subscribePartial(topic, {
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
    ctx.nodeA.pubsub.publishPartial({
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
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    // Subscribe nodeA
    ctx.nodeA.pubsub.subscribePartial(topic, {
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
    ctx.nodeA.pubsub.publishPartial({
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

  it('should not send partial to peers without partial opts', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    // Subscribe nodeA
    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Add nodeB to the topic's peer set
    if (!gsA.topics.has(topic)) {
      gsA.topics.set(topic, new Set())
    }
    gsA.topics.get(topic).add(bId)

    // Do NOT set any peerPartialOpts for nodeB

    // Spy on sendRpc
    const sentRpcs: Array<{ peerId: string, rpc: RPC }> = []
    const origSendRpc = gsA.sendRpc.bind(gsA)
    gsA.sendRpc = (id: string, rpc: RPC): boolean => {
      sentRpcs.push({ peerId: id, rpc })
      return origSendRpc(id, rpc)
    }

    ctx.nodeA.pubsub.publishPartial({
      topic,
      groupID: new Uint8Array([1, 2, 3]),
      partialMessage: new Uint8Array([4, 5, 6]),
      partsMetadata: new Uint8Array([0b1010])
    })

    // No partial RPC should be sent to nodeB
    const sentToB = sentRpcs.find(s => s.peerId === bId && s.rpc.partial != null)
    expect(sentToB).to.be.undefined()
  })

  it('should not send partial to peers subscribed to different topic', () => {
    const topicA = 'topic-a'
    const topicB = 'topic-b'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    // Subscribe nodeA to topic A
    ctx.nodeA.pubsub.subscribePartial(topicA, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Add nodeB to topic A's peer set
    if (!gsA.topics.has(topicA)) {
      gsA.topics.set(topicA, new Set())
    }
    gsA.topics.get(topicA).add(bId)

    // Set nodeB's partial opts for topic B only (not topic A)
    gsA.peerPartialOpts.set(bId, new Map())
    gsA.peerPartialOpts.get(bId).set(topicB, {
      requestsPartial: true,
      supportsSendingPartial: true
    } as PartialSubscriptionOpts)

    // Spy on sendRpc
    const sentRpcs: Array<{ peerId: string, rpc: RPC }> = []
    const origSendRpc = gsA.sendRpc.bind(gsA)
    gsA.sendRpc = (id: string, rpc: RPC): boolean => {
      sentRpcs.push({ peerId: id, rpc })
      return origSendRpc(id, rpc)
    }

    ctx.nodeA.pubsub.publishPartial({
      topic: topicA,
      groupID: new Uint8Array([1, 2, 3]),
      partialMessage: new Uint8Array([4, 5, 6]),
      partsMetadata: new Uint8Array([0b1010])
    })

    // No partial RPC should be sent to nodeB for topic A
    const sentToB = sentRpcs.find(s => s.peerId === bId && s.rpc.partial != null)
    expect(sentToB).to.be.undefined()
  })

  it('should create PartialMessageState on-demand when publishing', () => {
    const topic = 'test-topic'
    const gsA = ctx.nodeA.pubsub as any

    // Do NOT call subscribePartial, so no state exists yet
    expect(gsA.partialMessageState.has(topic)).to.be.false()

    ctx.nodeA.pubsub.publishPartial({
      topic,
      groupID: new Uint8Array([1, 2, 3]),
      partialMessage: new Uint8Array([4, 5, 6]),
      partsMetadata: new Uint8Array([0b1010])
    })

    // State should be created on-demand
    expect(gsA.partialMessageState.has(topic)).to.be.true()
    const state = gsA.partialMessageState.get(topic)
    expect(state.hasGroup(new Uint8Array([1, 2, 3]))).to.be.true()
  })

  it('should send partial data to eligible non-mesh peers', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    if (!gsA.topics.has(topic)) {
      gsA.topics.set(topic, new Set())
    }
    gsA.topics.get(topic).add(bId)

    // Ensure peer is not in mesh for this topic
    const meshPeers = gsA.mesh.get(topic)
    if (meshPeers != null) {
      meshPeers.delete(bId)
    }

    gsA.peerPartialOpts.set(bId, new Map())
    gsA.peerPartialOpts.get(bId).set(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    } as PartialSubscriptionOpts)

    const sentRpcs: Array<{ peerId: string, rpc: RPC }> = []
    const origSendRpc = gsA.sendRpc.bind(gsA)
    gsA.sendRpc = (id: string, rpc: RPC): boolean => {
      sentRpcs.push({ peerId: id, rpc })
      return origSendRpc(id, rpc)
    }

    ctx.nodeA.pubsub.publishPartial({
      topic,
      groupID: new Uint8Array([7, 8, 9]),
      partialMessage: new Uint8Array([1, 2, 3]),
      partsMetadata: new Uint8Array([0b1111])
    })

    const sentToB = sentRpcs.find((entry) => entry.peerId === bId && entry.rpc.partial != null)
    expect(sentToB).to.not.be.undefined()
    expect(sentToB?.rpc.partial?.partialMessage).to.deep.equal(new Uint8Array([1, 2, 3]))
  })
})
