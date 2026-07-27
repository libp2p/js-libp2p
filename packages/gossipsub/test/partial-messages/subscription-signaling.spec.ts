import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { RPC } from '../../src/message/rpc.js'
import { createComponents } from '../utils/create-pubsub.js'
import { setupTwoNodes, teardownTwoNodes } from './utils.js'
import type { TwoNodeContext } from './utils.js'

describe('partial messages - subscription signaling', () => {
  let ctx: TwoNodeContext

  beforeEach(async () => {
    ctx = await setupTwoNodes()
  })

  afterEach(async () => {
    await teardownTwoNodes(ctx)
  })

  it('should include partial flags in SubOpts when subscribePartial is called', async () => {
    const topic = 'test-topic'

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Verify partialTopics was updated
    const partialOpts = ctx.nodeA.pubsub.partialTopics.get(topic)
    expect(partialOpts).to.not.be.undefined()
    expect(partialOpts?.requestsPartial).to.be.true()
    expect(partialOpts?.supportsSendingPartial).to.be.true()

    // Verify the topic was subscribed
    expect(ctx.nodeA.pubsub.getTopics()).to.include(topic)
  })

  it('should remove partial flags when unsubscribePartial is called', async () => {
    const topic = 'test-topic'

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    expect(ctx.nodeA.pubsub.partialTopics.has(topic)).to.be.true()

    ctx.nodeA.pubsub.unsubscribePartial(topic)

    expect(ctx.nodeA.pubsub.partialTopics.has(topic)).to.be.false()
  })

  it('should track peer partial opts when receiving subscription with partial flags', async () => {
    const topic = 'test-topic'
    const aId = ctx.nodeA.components.peerId.toString()

    // Simulate nodeB receiving an RPC from nodeA with partial subscription flags
    // This tests the handleReceivedRpc path that processes partial SubOpts
    const gsB = ctx.nodeB.pubsub as any
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
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, rpc)

    // Verify nodeB tracked nodeA's partial opts
    const peerOpts = gsB.peerPartialOpts.get(aId)
    expect(peerOpts).to.not.be.undefined()
    const topicOpts = peerOpts?.get(topic)
    expect(topicOpts?.requestsPartial).to.be.true()
    expect(topicOpts?.supportsSendingPartial).to.be.true()

    // Verify nodeB sees nodeA subscribed
    const subscribers = ctx.nodeB.pubsub.getSubscribers(topic)
    expect(subscribers.map(p => p.toString())).to.include(aId)
  })

  it('should remove peer partial opts on unsubscribe', async () => {
    const topic = 'test-topic'
    const aId = ctx.nodeA.components.peerId.toString()
    const gsB = ctx.nodeB.pubsub as any

    // First subscribe
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
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
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [{
        subscribe: false,
        topic,
        requestsPartial: true,
        supportsSendingPartial: true
      }],
      messages: []
    })

    // The topic should be removed from the peer's opts
    expect(gsB.peerPartialOpts.get(aId)?.has(topic) ?? false).to.be.false()
  })

  it('should normalize received peer opts when requestsPartial is true', async () => {
    const topic = 'test-topic'
    const aId = ctx.nodeA.components.peerId.toString()
    const gsB = ctx.nodeB.pubsub as any

    await gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [{
        subscribe: true,
        topic,
        requestsPartial: true,
        supportsSendingPartial: false
      }],
      messages: []
    })

    const peerOpts = gsB.peerPartialOpts.get(aId)?.get(topic)
    expect(peerOpts).to.not.be.undefined()
    expect(peerOpts?.requestsPartial).to.be.true()
    expect(peerOpts?.supportsSendingPartial).to.be.true()
  })

  it('should enforce supportsSendingPartial when requestsPartial is true', () => {
    const topic = 'test-topic'

    // Per spec: "If a node requests partial messages, it MUST support sending partial messages."
    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: false
    })

    const opts = ctx.nodeA.pubsub.partialTopics.get(topic)
    expect(opts).to.not.be.undefined()
    expect(opts?.requestsPartial).to.be.true()
    expect(opts?.supportsSendingPartial).to.be.true()
  })

  it('should normalize outgoing SubOpts when requestsPartial is true', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    const sentRpcs: Array<{ peerId: string, rpc: RPC }> = []
    const origSendRpc = gsA.sendRpc.bind(gsA)
    gsA.sendRpc = (id: string, rpc: RPC): boolean => {
      sentRpcs.push({ peerId: id, rpc })
      return origSendRpc(id, rpc)
    }

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: false
    })

    const sentToB = sentRpcs.find(s =>
      s.peerId === bId &&
      s.rpc.subscriptions.some(sub => sub.topic === topic)
    )
    expect(sentToB).to.not.be.undefined()

    const sub = sentToB?.rpc.subscriptions.find(s => s.topic === topic)
    expect(sub?.requestsPartial).to.be.true()
    expect(sub?.supportsSendingPartial).to.be.true()
  })

  it('should clear stale peer partial opts when peer re-subscribes without partial flags', async () => {
    const topic = 'test-topic'
    const aId = ctx.nodeA.components.peerId.toString()
    const gsB = ctx.nodeB.pubsub as any

    // Initial subscription with partial flags
    await gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [{
        subscribe: true,
        topic,
        requestsPartial: true,
        supportsSendingPartial: true
      }],
      messages: []
    })

    expect(gsB.peerPartialOpts.get(aId)?.get(topic)?.requestsPartial).to.be.true()

    // Re-subscribe without partial flags (how unsubscribePartial re-advertises)
    await gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [{
        subscribe: true,
        topic
      }],
      messages: []
    })

    // Stale partial opts should be removed
    expect(gsB.peerPartialOpts.get(aId)?.has(topic) ?? false).to.be.false()
  })

  it('should send updated SubOpts with partial flags to connected peers', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    // Spy on sendRpc to capture what gets sent when subscribing
    const sentRpcs: Array<{ peerId: string, rpc: RPC }> = []
    const origSendRpc = gsA.sendRpc.bind(gsA)
    gsA.sendRpc = (id: string, rpc: RPC): boolean => {
      sentRpcs.push({ peerId: id, rpc })
      return origSendRpc(id, rpc)
    }

    // nodeA subscribes with partial support
    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Verify that an RPC was sent to nodeB with partial flags in SubOpts
    const sentToB = sentRpcs.find(s =>
      s.peerId === bId &&
      s.rpc.subscriptions.some(sub =>
        sub.topic === topic && sub.requestsPartial === true
      )
    )
    expect(sentToB).to.not.be.undefined()
    const sub = sentToB?.rpc.subscriptions.find(s => s.topic === topic)
    expect(sub?.requestsPartial).to.be.true()
    expect(sub?.supportsSendingPartial).to.be.true()
  })

  it('should re-send subscription without partial flags on unsubscribePartial', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    // First subscribe with partial
    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Now spy on sendRpc to capture the re-send
    const sentRpcs: Array<{ peerId: string, rpc: RPC }> = []
    const origSendRpc = gsA.sendRpc.bind(gsA)
    gsA.sendRpc = (id: string, rpc: RPC): boolean => {
      sentRpcs.push({ peerId: id, rpc })
      return origSendRpc(id, rpc)
    }

    // Unsubscribe partial
    ctx.nodeA.pubsub.unsubscribePartial(topic)

    // Verify that an RPC was sent to nodeB with SubOpts without partial flags
    const sentToB = sentRpcs.find(s =>
      s.peerId === bId &&
      s.rpc.subscriptions.some(sub => sub.topic === topic)
    )
    expect(sentToB).to.not.be.undefined()
    const sub = sentToB?.rpc.subscriptions.find(s => s.topic === topic)
    // After unsubscribePartial, the topic is no longer in partialTopics,
    // so sendSubscriptions won't include partial flags
    expect(sub?.requestsPartial).to.be.undefined()
    expect(sub?.supportsSendingPartial).to.be.undefined()
  })

  it('should handle supportsSendingPartial without requestsPartial', () => {
    const topic = 'test-topic'

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: false,
      supportsSendingPartial: true
    })

    const opts = ctx.nodeA.pubsub.partialTopics.get(topic)
    expect(opts).to.not.be.undefined()
    expect(opts?.requestsPartial).to.be.false()
    expect(opts?.supportsSendingPartial).to.be.true()

    // Verify the topic was subscribed
    expect(ctx.nodeA.pubsub.getTopics()).to.include(topic)
  })

  // Replaces a test that rebuilt sendSubscriptions' logic inside its own body
  // and asserted on the copy, never calling the production code. Outgoing
  // SubOpts flags are covered for real at 'should normalize outgoing SubOpts'
  // and 'should send updated SubOpts', so this slot now carries the peer-opts
  // bookkeeping cases that had no coverage at all.

  it('should drop the peer entry entirely once its last topic loses partial opts', async () => {
    const topicA = 'topic-a'
    const topicB = 'topic-b'
    const aId = ctx.nodeA.components.peerId.toString()
    const gsB = ctx.nodeB.pubsub as any

    await gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [
        { subscribe: true, topic: topicA, requestsPartial: true, supportsSendingPartial: true },
        { subscribe: true, topic: topicB, requestsPartial: true, supportsSendingPartial: true }
      ],
      messages: []
    })

    expect(gsB.peerPartialOpts.get(aId)?.size).to.equal(2)

    // Dropping one topic leaves the peer entry in place...
    await gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [{ subscribe: false, topic: topicA }],
      messages: []
    })

    expect(gsB.peerPartialOpts.get(aId)?.size).to.equal(1)

    // ...and dropping the last one removes the outer map entry rather than
    // leaving an empty Map behind.
    await gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [{ subscribe: false, topic: topicB }],
      messages: []
    })

    expect(gsB.peerPartialOpts.has(aId)).to.be.false()
  })

  it('should refuse subscribePartial for a topic outside allowedTopics', async () => {
    // handleReceivedPartial already refuses partials for disallowed topics;
    // subscribePartial accepted them, so a node could register partial support
    // for a topic its own allowlist forbids.
    const restricted = await createComponents({
      init: { emitSelf: false, allowedTopics: ['allowed-topic'] }
    })

    try {
      expect(() => {
        restricted.pubsub.subscribePartial('disallowed-topic', {
          requestsPartial: true,
          supportsSendingPartial: true
        })
      }).to.throw(/not in the allowed topic list/)

      expect(restricted.pubsub.partialTopics.has('disallowed-topic')).to.be.false()

      // The allowed topic still works.
      restricted.pubsub.subscribePartial('allowed-topic', {
        requestsPartial: true,
        supportsSendingPartial: true
      })
      expect(restricted.pubsub.partialTopics.has('allowed-topic')).to.be.true()
    } finally {
      await stop(restricted.pubsub, ...Object.entries(restricted.components))
    }
  })

  it('should keep partial opts isolated between topics for the same peer', async () => {
    const topicA = 'topic-a'
    const topicB = 'topic-b'
    const aId = ctx.nodeA.components.peerId.toString()
    const gsB = ctx.nodeB.pubsub as any

    await gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [
        { subscribe: true, topic: topicA, requestsPartial: true, supportsSendingPartial: true },
        { subscribe: true, topic: topicB, requestsPartial: false, supportsSendingPartial: true }
      ],
      messages: []
    })

    const opts = gsB.peerPartialOpts.get(aId)
    expect(opts?.get(topicA)?.requestsPartial).to.be.true()
    expect(opts?.get(topicB)?.requestsPartial).to.be.false()
    expect(opts?.get(topicB)?.supportsSendingPartial).to.be.true()
  })
})
