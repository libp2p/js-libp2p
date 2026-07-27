import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { RPC } from '../../src/message/rpc.js'
import { createComponents, connectPubsubNodes } from '../utils/create-pubsub.js'
import { setupTwoNodes, teardownTwoNodes, waitForTopicPeer } from './utils.js'
import type { TwoNodeContext } from './utils.js'

/**
 * gossipsub v1.3, The Extensions Control Message:
 *
 *   "If a peer supports any extension, the Extensions control message MUST be
 *    included in the first message on the stream. An Extensions control
 *    message MUST NOT be sent more than once."
 *
 * Both requirements are scoped to the *stream*, which is why the sent-marker
 * is keyed on the outbound stream rather than the peer id.
 */
describe('partial messages - extension handshake', () => {
  let ctx: TwoNodeContext

  beforeEach(async () => {
    ctx = await setupTwoNodes()
  })

  afterEach(async () => {
    await teardownTwoNodes(ctx)
  })

  /** Capture every RPC pushed onto the outbound stream to a given peer. */
  function captureOutbound (from: any, toId: string): RPC[] {
    const captured: RPC[] = []
    const outboundStream = from.streamsOutbound.get(toId)
    const origPush = outboundStream.push.bind(outboundStream)
    outboundStream.push = (bytes: Uint8Array) => {
      captured.push(RPC.decode(bytes))
      return origPush(bytes)
    }
    return captured
  }

  it('includes the handshake in the first message on a stream', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    // Capture before the handshake can be triggered, so the assertion covers
    // the genuinely-first RPC. The previous version of this test subscribed
    // first, then cleared the sent-marker to force a *second* handshake, which
    // asserted the inverse of the MUST NOT.
    const sent = captureOutbound(gsA, bId)

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    expect(sent.length).to.be.greaterThan(0, 'expected an RPC to be sent')
    expect(sent[0].control?.extensions?.partialMessages).to.equal(true)
  })

  it('does not repeat the handshake on later messages to the same stream', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    const sent = captureOutbound(gsA, bId)

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })
    ctx.nodeA.pubsub.subscribePartial('another-topic', {
      requestsPartial: true,
      supportsSendingPartial: true
    })
    gsA.sendRpc(bId, { subscriptions: [], messages: [] })

    expect(sent.length).to.be.greaterThan(1, 'expected several RPCs to be sent')

    const withHandshake = sent.filter(rpc => rpc.control?.extensions?.partialMessages === true)
    expect(withHandshake).to.have.length(1)
  })

  it('does not leak the handshake to peers that already received one', async () => {
    // publish() reuses a single RPC object for every recipient. When the
    // handshake was written into that object in place, the first peer to
    // trigger it caused every later peer in the loop to receive one too —
    // including peers already handshaken.
    const topic = 'test-topic'
    const nodeC = await createComponents({ init: { emitSelf: false } })

    try {
      await connectPubsubNodes(ctx.nodeA, nodeC)

      const bId = ctx.nodeB.components.peerId.toString()
      const cId = nodeC.components.peerId.toString()
      const gsA = ctx.nodeA.pubsub as any

      ctx.nodeA.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })
      ctx.nodeB.pubsub.subscribe(topic)
      nodeC.pubsub.subscribe(topic)

      await waitForTopicPeer(ctx.nodeA, ctx.nodeB, topic)
      await waitForTopicPeer(ctx.nodeA, nodeC, topic)

      // Both streams have now had their handshake. Capture from here on.
      const toB = captureOutbound(gsA, bId)
      const toC = captureOutbound(gsA, cId)

      await ctx.nodeA.pubsub.publish(topic, Uint8Array.from([1, 2, 3]))

      expect(toB.filter(rpc => rpc.control?.extensions != null)).to.have.length(0)
      expect(toC.filter(rpc => rpc.control?.extensions != null)).to.have.length(0)
    } finally {
      await stop(nodeC.pubsub, ...Object.entries(nodeC.components))
    }
  })

  it('sends the handshake on the batchPublish path', async () => {
    // sendRpcInBatch pre-encodes one buffer for all recipients and pushes it
    // directly, so it used to bypass the handshake entirely.
    const topic = 'test-topic'
    const publisher = await createComponents({ init: { emitSelf: false, batchPublish: true } })

    try {
      await connectPubsubNodes(publisher, ctx.nodeB)

      const bId = ctx.nodeB.components.peerId.toString()
      const gsP = publisher.pubsub as any

      const sent = captureOutbound(gsP, bId)

      // Enable partial support without any prior RPC, so the publish below is
      // the first message that can carry the handshake.
      publisher.pubsub.partialTopics.set(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })
      publisher.pubsub.subscribe(topic)
      ctx.nodeB.pubsub.subscribe(topic)

      await waitForTopicPeer(publisher, ctx.nodeB, topic)
      await publisher.pubsub.publish(topic, Uint8Array.from([1, 2, 3]))

      const withHandshake = sent.filter(rpc => rpc.control?.extensions?.partialMessages === true)
      expect(withHandshake).to.have.length(1)
    } finally {
      await stop(publisher.pubsub, ...Object.entries(publisher.components))
    }
  })

  it('sends a fresh handshake on a new stream to a known peer', async () => {
    // The marker is keyed on the stream, so a replaced stream must handshake
    // again. Keying it on the peer id meant a reconnected stream's first
    // message silently omitted the extensions.
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const firstStream = gsA.streamsOutbound.get(bId)
    expect(gsA.sentExtensions.has(firstStream)).to.be.true()

    // Simulate the stream being replaced without the peer going away.
    const sent: RPC[] = []
    const replacement = {
      protocol: firstStream.protocol,
      push (bytes: Uint8Array): void { sent.push(RPC.decode(bytes)) },
      close: async (): Promise<void> => {}
    }
    gsA.streamsOutbound.set(bId, replacement)

    try {
      gsA.sendRpc(bId, { subscriptions: [], messages: [] })

      expect(sent).to.have.length(1)
      expect(sent[0].control?.extensions?.partialMessages).to.equal(true)
    } finally {
      // Put the real stream back so teardown can close it.
      gsA.streamsOutbound.set(bId, firstStream)
    }
  })

  it('should not mark extension as sent when first RPC send fails', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    const outboundStream = gsA.streamsOutbound.get(bId)
    expect(outboundStream).to.not.be.undefined()

    const originalPush = outboundStream.push.bind(outboundStream)
    outboundStream.push = () => {
      throw new Error('boom')
    }

    ctx.nodeA.pubsub.partialTopics.set(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const sent = gsA.sendRpc(bId, {
      subscriptions: [],
      messages: []
    })

    expect(sent).to.be.false()
    expect(gsA.sentExtensions.has(outboundStream)).to.be.false()

    outboundStream.push = originalPush
  })

  it('should not include extensions handshake when no partial topics', () => {
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    expect(ctx.nodeA.pubsub.partialTopics.size).to.equal(0)

    const sent = captureOutbound(gsA, bId)

    gsA.sendRpc(bId, { subscriptions: [], messages: [] })

    expect(sent).to.have.length(1)
    expect(sent[0].control?.extensions).to.be.undefined()
  })

  it('should process the rest of an RPC that carries an extension handshake', async () => {
    // Assert something the handshake path could actually break: that
    // co-located subscriptions in the same RPC are still applied.
    //
    // Note the receiver does not record the advertised capability anywhere —
    // it is logged and discarded (F-07). Once that is resolved this test
    // should also assert the peer is marked as partial-capable.
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any
    const aId = ctx.nodeA.components.peerId.toString()

    await gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [{
        subscribe: true,
        topic,
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
      }
    })

    expect(ctx.nodeB.pubsub.getSubscribers(topic).map(p => p.toString())).to.include(aId)
    expect(gsB.peerPartialOpts.get(aId)?.get(topic)?.requestsPartial).to.be.true()
  })
})
