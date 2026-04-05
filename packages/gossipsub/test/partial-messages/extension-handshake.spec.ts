import { expect } from 'aegir/chai'
import { RPC } from '../../src/message/rpc.js'
import { setupTwoNodes, teardownTwoNodes } from './utils.js'
import type { TwoNodeContext } from './utils.js'

describe('partial messages - extension handshake', () => {
  let ctx: TwoNodeContext

  beforeEach(async () => {
    ctx = await setupTwoNodes()
  })

  afterEach(async () => {
    await teardownTwoNodes(ctx)
  })

  it('should include extensions handshake in first RPC when node has partial topics', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    // Subscribe with partial to set up partialTopics
    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Clear sentExtensions to ensure we can test the first-RPC behavior
    gsA.sentExtensions.clear()

    // Capture encoded RPCs
    const sentRpcBytes: Uint8Array[] = []
    const outboundStream = gsA.streamsOutbound.get(bId)
    if (outboundStream != null) {
      const origPush = outboundStream.push.bind(outboundStream)
      outboundStream.push = (bytes: Uint8Array) => {
        sentRpcBytes.push(bytes)
        return origPush(bytes)
      }
    }

    // Send an RPC to nodeB
    gsA.sendRpc(bId, {
      subscriptions: [],
      messages: []
    })

    // Verify RPC bytes were actually captured and decode them
    expect(sentRpcBytes.length).to.be.greaterThan(0, 'expected RPC bytes to be captured')
    const decoded = RPC.decode(sentRpcBytes[0])
    expect(decoded.control?.extensions?.partialMessages).to.equal(true)

    // sentExtensions should now include this peer
    expect(gsA.sentExtensions.has(bId)).to.be.true()
  })

  it('should not include extensions handshake on subsequent RPCs', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Mark that we already sent extensions to this peer
    gsA.sentExtensions.add(bId)

    // Capture encoded RPCs
    const sentRpcBytes: Uint8Array[] = []
    const outboundStream = gsA.streamsOutbound.get(bId)
    if (outboundStream != null) {
      const origPush = outboundStream.push.bind(outboundStream)
      outboundStream.push = (bytes: Uint8Array) => {
        sentRpcBytes.push(bytes)
        return origPush(bytes)
      }
    }

    // Send another RPC
    gsA.sendRpc(bId, {
      subscriptions: [],
      messages: []
    })

    // Verify RPC bytes were captured and second RPC does NOT include extensions
    expect(sentRpcBytes.length).to.be.greaterThan(0, 'expected RPC bytes to be captured')
    const decoded = RPC.decode(sentRpcBytes[0])
    expect(decoded.control?.extensions).to.be.undefined()
  })

  it('should not include extensions handshake when no partial topics', () => {
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    // Ensure no partial topics
    expect(ctx.nodeA.pubsub.partialTopics.size).to.equal(0)

    // Capture encoded RPCs
    const sentRpcBytes: Uint8Array[] = []
    const outboundStream = gsA.streamsOutbound.get(bId)
    if (outboundStream != null) {
      const origPush = outboundStream.push.bind(outboundStream)
      outboundStream.push = (bytes: Uint8Array) => {
        sentRpcBytes.push(bytes)
        return origPush(bytes)
      }
    }

    // Send an RPC
    gsA.sendRpc(bId, {
      subscriptions: [],
      messages: []
    })

    // Verify RPC bytes were captured and no extensions are included
    expect(sentRpcBytes.length).to.be.greaterThan(0, 'expected RPC bytes to be captured')
    const decoded = RPC.decode(sentRpcBytes[0])
    expect(decoded.control?.extensions).to.be.undefined()

    // sentExtensions should NOT include this peer
    expect(gsA.sentExtensions.has(bId)).to.be.false()
  })

  it('should not mark extension as sent when first RPC send fails', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    gsA.sentExtensions.clear()

    const outboundStream = gsA.streamsOutbound.get(bId)
    expect(outboundStream).to.not.be.undefined()

    const originalPush = outboundStream.push.bind(outboundStream)
    outboundStream.push = () => {
      throw new Error('boom')
    }

    const sent = gsA.sendRpc(bId, {
      subscriptions: [],
      messages: []
    })

    expect(sent).to.be.false()
    expect(gsA.sentExtensions.has(bId)).to.be.false()

    outboundStream.push = originalPush
  })

  it('should log peer support when receiving extension handshake', async () => {
    const gsB = ctx.nodeB.pubsub as any
    const aId = ctx.nodeA.components.peerId.toString()

    // Send an RPC with extension handshake from nodeA
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [],
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

    // The implementation logs "peer %s supports partial messages extension"
    // We just verify the RPC was processed without error - the logging is internal
    // The peer should still be tracked (no crash)
    expect(gsB.peers.has(aId)).to.be.true()
  })
})
