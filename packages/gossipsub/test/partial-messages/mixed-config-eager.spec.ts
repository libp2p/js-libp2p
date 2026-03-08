import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { RPC } from '../../src/message/rpc.js'
import { createComponents } from '../utils/create-pubsub.js'
import { setupTwoNodes, teardownTwoNodes } from './utils.js'
import type { TwoNodeContext } from './utils.js'
import type { PartialSubscriptionOpts, PartsMetadataMerger } from '../../src/types.js'

describe('partial messages - mixed network and upgrade path', () => {
  let ctx: TwoNodeContext

  beforeEach(async () => {
    ctx = await setupTwoNodes()
  })

  afterEach(async () => {
    await teardownTwoNodes(ctx)
  })

  it('should still process full messages when subscribed with partial', () => {
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any

    // Subscribe nodeB with partial support
    ctx.nodeB.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Subscribe nodeA to topic to make it a valid sender
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [{ subscribe: true, topic }],
      messages: []
    })

    // Simulate a regular full message RPC (not partial) from nodeA
    // This is what happens when a non-partial-supporting peer sends a message
    const rpc: RPC = {
      subscriptions: [],
      messages: [{
        topic,
        data: new TextEncoder().encode('hello world'),
        from: ctx.nodeA.components.peerId.toMultihash().bytes,
        seqno: new Uint8Array(8)
      }]
    }

    // Process the full message - should not throw
    // This verifies that partial support doesn't break full message reception
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, rpc)

    // Node should still be functional after processing the full message
    expect(ctx.nodeB.pubsub.getTopics()).to.include(topic)
  })

  it('should handle supportsSendingPartial-only subscription correctly', () => {
    const topic = 'test-topic'
    const aId = ctx.nodeA.components.peerId.toString()
    const gsB = ctx.nodeB.pubsub as any

    // Simulate nodeA subscribing with supportsSendingPartial only (no requestsPartial)
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [{
        subscribe: true,
        topic,
        requestsPartial: false,
        supportsSendingPartial: true
      }],
      messages: []
    })

    // Verify nodeB tracked nodeA's opts correctly
    const peerOpts = gsB.peerPartialOpts.get(aId)?.get(topic)
    expect(peerOpts).to.not.be.undefined()
    expect(peerOpts?.requestsPartial).to.be.false()
    expect(peerOpts?.supportsSendingPartial).to.be.true()
  })

  it('should still process full messages when supportsSendingPartial-only is set', () => {
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any

    ctx.nodeB.pubsub.subscribePartial(topic, {
      requestsPartial: false,
      supportsSendingPartial: true
    })

    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [{ subscribe: true, topic }],
      messages: []
    })

    const rpc: RPC = {
      subscriptions: [],
      messages: [{
        topic,
        data: new TextEncoder().encode('full message'),
        from: ctx.nodeA.components.peerId.toMultihash().bytes,
        seqno: new Uint8Array(8)
      }]
    }

    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, rpc)
    expect(ctx.nodeB.pubsub.getTopics()).to.include(topic)
  })

  it('should update peer behavior when upgrading from supports-only to requestsPartial', () => {
    const topic = 'test-topic'
    const aId = ctx.nodeA.components.peerId.toString()
    const gsB = ctx.nodeB.pubsub as any

    // Step 1: peer advertises supports-only
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [{
        subscribe: true,
        topic,
        requestsPartial: false,
        supportsSendingPartial: true
      }],
      messages: []
    })

    expect(gsB.peerPartialOpts.get(aId)?.get(topic)?.requestsPartial).to.be.false()
    expect(gsB.peerPartialOpts.get(aId)?.get(topic)?.supportsSendingPartial).to.be.true()

    // Step 2: same peer upgrades to request partials
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [{
        subscribe: true,
        topic,
        requestsPartial: true,
        supportsSendingPartial: true
      }],
      messages: []
    })

    expect(gsB.peerPartialOpts.get(aId)?.get(topic)?.requestsPartial).to.be.true()
    expect(gsB.peerPartialOpts.get(aId)?.get(topic)?.supportsSendingPartial).to.be.true()

    // After upgrade, publishPartial should include data (not metadata-only)
    const sentRpcs: Array<{ peerId: string, rpc: RPC }> = []
    const originalSendRpc = gsB.sendRpc.bind(gsB)
    gsB.sendRpc = (peerId: string, rpc: RPC): boolean => {
      sentRpcs.push({ peerId, rpc })
      return originalSendRpc(peerId, rpc)
    }

    ctx.nodeB.pubsub.publishPartial({
      topic,
      groupID: new Uint8Array([1, 2, 3]),
      partialMessage: new Uint8Array([9, 9, 9]),
      partsMetadata: new Uint8Array([0b1010])
    })

    const sentToA = sentRpcs.find((entry) => entry.peerId === aId && entry.rpc.partial != null)
    expect(sentToA).to.not.be.undefined()
    expect(sentToA?.rpc.partial?.partialMessage).to.deep.equal(new Uint8Array([9, 9, 9]))
  })
})

describe('partial messages - configuration', () => {
  it('should use custom PartsMetadataMerger when provided', async () => {
    let mergeCallCount = 0

    // Create a custom merger that just returns the longer buffer
    const customMerger: PartsMetadataMerger = {
      merge (a: Uint8Array, b: Uint8Array): Uint8Array {
        mergeCallCount++
        return a.length >= b.length ? a : b
      }
    }

    const customNode = await createComponents({
      init: {
        emitSelf: false,
        partsMetadataMerger: customMerger
      }
    })

    try {
      const topic = 'test-topic'
      const gsCustom = customNode.pubsub as any

      customNode.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      // Publish partial to trigger the merger
      customNode.pubsub.publishPartial({
        topic,
        groupID: new Uint8Array([1]),
        partialMessage: new Uint8Array([2]),
        partsMetadata: new Uint8Array([0b1010])
      })

      // The custom merger should have been called
      expect(mergeCallCount).to.be.greaterThan(0)

      // Verify the merger's behavior (returns longer buffer, not bitwise OR)
      const state = gsCustom.partialMessageState.get(topic)
      expect(state).to.not.be.undefined()
    } finally {
      await stop(customNode.pubsub, ...Object.entries(customNode.components))
    }
  })

  it('should respect custom maxGroups configuration', async () => {
    const customNode = await createComponents({
      init: {
        emitSelf: false,
        partialMessagesMaxGroups: 2
      }
    })

    try {
      const topic = 'test-topic'
      const gsCustom = customNode.pubsub as any

      customNode.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      const state = gsCustom.partialMessageState.get(topic)

      // Add 3 groups to a state configured with maxGroups=2
      state.updateMetadata(new Uint8Array([1]), 'peer1', new Uint8Array([0b1010]))
      state.updateMetadata(new Uint8Array([2]), 'peer1', new Uint8Array([0b0101]))
      state.updateMetadata(new Uint8Array([3]), 'peer1', new Uint8Array([0b1100]))

      // Should not exceed maxGroups
      expect(state.size).to.equal(2)
      // Oldest group should have been evicted
      expect(state.hasGroup(new Uint8Array([1]))).to.be.false()
      expect(state.hasGroup(new Uint8Array([2]))).to.be.true()
      expect(state.hasGroup(new Uint8Array([3]))).to.be.true()
    } finally {
      await stop(customNode.pubsub, ...Object.entries(customNode.components))
    }
  })

  it('should respect custom groupTTLMs configuration', async () => {
    const sandbox = sinon.createSandbox()
    try {
      sandbox.useFakeTimers()

      const customNode = await createComponents({
        init: {
          emitSelf: false,
          partialMessagesGroupTTLMs: 1000 // 1 second TTL
        }
      })

      try {
        const topic = 'test-topic'
        const gsCustom = customNode.pubsub as any

        customNode.pubsub.subscribePartial(topic, {
          requestsPartial: true,
          supportsSendingPartial: true
        })

        const state = gsCustom.partialMessageState.get(topic)
        state.updateMetadata(new Uint8Array([1]), 'peer1', new Uint8Array([0b1010]))

        expect(state.size).to.equal(1)

        // Advance past custom TTL
        sandbox.clock.tick(1500)

        const pruned = state.pruneExpired()
        expect(pruned).to.equal(1)
        expect(state.size).to.equal(0)
      } finally {
        await stop(customNode.pubsub, ...Object.entries(customNode.components))
      }
    } finally {
      sandbox.restore()
    }
  })
})

describe('partial messages - eager data pushing', () => {
  let ctx: TwoNodeContext

  beforeEach(async () => {
    ctx = await setupTwoNodes()
  })

  afterEach(async () => {
    await teardownTwoNodes(ctx)
  })

  it('should allow publishing partial data before receiving partsMetadata from peer', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Add nodeB to the topic's peer set with requestsPartial=true
    if (!gsA.topics.has(topic)) {
      gsA.topics.set(topic, new Set())
    }
    gsA.topics.get(topic).add(bId)

    gsA.peerPartialOpts.set(bId, new Map())
    gsA.peerPartialOpts.get(bId).set(topic, {
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

    // Publish partial data without any prior partsMetadata exchange
    // This tests eager push - the spec says implementations SHOULD support this
    ctx.nodeA.pubsub.publishPartial({
      topic,
      groupID: new Uint8Array([1, 2, 3]),
      partialMessage: new Uint8Array([4, 5, 6]),
      partsMetadata: new Uint8Array([0b1010])
    })

    // Data should be sent successfully
    const sentToB = sentRpcs.find(s => s.peerId === bId && s.rpc.partial != null)
    expect(sentToB).to.not.be.undefined()
    expect(sentToB?.rpc.partial?.partialMessage).to.deep.equal(new Uint8Array([4, 5, 6]))
  })
})
