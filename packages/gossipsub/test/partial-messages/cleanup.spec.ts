import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { createComponents } from '../utils/create-pubsub.js'
import { setupTwoNodes, teardownTwoNodes } from './utils.js'
import type { TwoNodeContext } from './utils.js'

describe('partial messages - cleanup', () => {
  let ctx: TwoNodeContext

  beforeEach(async () => {
    ctx = await setupTwoNodes()
  })

  afterEach(async () => {
    await teardownTwoNodes(ctx)
  })

  it('should clean up partial state when unsubscribePartial is called', () => {
    const topic = 'test-topic'

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Verify state exists
    const gsA = ctx.nodeA.pubsub as any
    expect(gsA.partialMessageState.has(topic)).to.be.true()
    expect(ctx.nodeA.pubsub.partialTopics.has(topic)).to.be.true()

    ctx.nodeA.pubsub.unsubscribePartial(topic)

    // Verify state cleaned up
    expect(gsA.partialMessageState.has(topic)).to.be.false()
    expect(ctx.nodeA.pubsub.partialTopics.has(topic)).to.be.false()
  })

  it('should clean up peer partial opts when peer is removed', () => {
    const peerAId = ctx.nodeA.components.peerId.toString()
    const gsB = ctx.nodeB.pubsub as any

    // Manually set peer opts to verify they get cleaned up
    gsB.peerPartialOpts.set(peerAId, new Map())
    gsB.peerPartialOpts.get(peerAId).set('test-topic', {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    expect(gsB.peerPartialOpts.has(peerAId)).to.be.true()

    // Directly trigger removePeer (simulates disconnect)
    gsB.removePeer(ctx.nodeA.components.peerId)

    // After peer removal, partial opts should be cleaned
    expect(gsB.peerPartialOpts.has(peerAId)).to.be.false()
  })

  it('should clean up sentExtensions when peer is removed', () => {
    const peerAId = ctx.nodeA.components.peerId.toString()
    const gsB = ctx.nodeB.pubsub as any

    // Manually set sentExtensions
    gsB.sentExtensions.add(peerAId)
    expect(gsB.sentExtensions.has(peerAId)).to.be.true()

    // Directly trigger removePeer
    gsB.removePeer(ctx.nodeA.components.peerId)

    expect(gsB.sentExtensions.has(peerAId)).to.be.false()
  })

  it('should clean up partialMessageState peer entries when peer is removed', () => {
    const topic = 'test-topic'
    const peerAId = ctx.nodeA.components.peerId.toString()
    const gsB = ctx.nodeB.pubsub as any

    // Subscribe nodeB with partial support
    ctx.nodeB.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Simulate having received partial metadata from nodeA
    const state = gsB.partialMessageState.get(topic)
    state.updateMetadata(new Uint8Array([1]), peerAId, new Uint8Array([0b1010]))
    expect(state.getPeerMetadata(new Uint8Array([1]), peerAId)).to.not.be.undefined()

    // Directly trigger removePeer
    gsB.removePeer(ctx.nodeA.components.peerId)

    // Peer metadata should be cleaned up
    expect(state.getPeerMetadata(new Uint8Array([1]), peerAId)).to.be.undefined()
  })

  it('should clear all partial state on stop', async () => {
    const topic = 'test-topic'
    const gsA = ctx.nodeA.pubsub as any

    // Set up various partial state
    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const bId = ctx.nodeB.components.peerId.toString()
    gsA.peerPartialOpts.set(bId, new Map())
    gsA.peerPartialOpts.get(bId).set(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })
    gsA.sentExtensions.add(bId)

    // Verify state exists
    expect(ctx.nodeA.pubsub.partialTopics.size).to.be.greaterThan(0)
    expect(gsA.partialMessageState.size).to.be.greaterThan(0)
    expect(gsA.peerPartialOpts.size).to.be.greaterThan(0)
    expect(gsA.sentExtensions.size).to.be.greaterThan(0)

    // Stop the node (including components to avoid resource leaks)
    await stop(ctx.nodeA.pubsub, ...Object.entries(ctx.nodeA.components))

    // All partial state should be cleared
    expect(ctx.nodeA.pubsub.partialTopics.size).to.equal(0)
    expect(gsA.partialMessageState.size).to.equal(0)
    expect(gsA.peerPartialOpts.size).to.equal(0)
    expect(gsA.sentExtensions.size).to.equal(0)

    // Re-create nodeA for afterEach cleanup (old components already stopped above)
    ctx.nodeA = await createComponents({
      init: { emitSelf: false }
    })
  })
})
