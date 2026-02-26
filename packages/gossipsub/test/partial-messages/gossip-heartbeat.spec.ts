import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { RPC } from '../../src/message/rpc.js'
import { setupTwoNodes, teardownTwoNodes } from './utils.js'
import type { TwoNodeContext } from './utils.js'
import type { PartialSubscriptionOpts } from '../../src/types.js'

describe('partial messages - gossip and heartbeat', () => {
  let ctx: TwoNodeContext

  beforeEach(async () => {
    ctx = await setupTwoNodes()
  })

  afterEach(async () => {
    await teardownTwoNodes(ctx)
  })

  it('should gossip partial metadata to non-mesh partial peers during heartbeat', async () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    // Subscribe nodeA with partial support
    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Add some state to gossip
    const state = gsA.partialMessageState.get(topic)
    state.updateMetadata(new Uint8Array([1]), ctx.nodeA.components.peerId.toString(), new Uint8Array([0b1010]))

    // Set nodeB as a peer with partial support for the topic
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

    // Call emitPartialGossip directly with nodeB in the gossip set
    const peersToGossipByTopic = new Map<string, Set<string>>()
    peersToGossipByTopic.set(topic, new Set([bId]))

    gsA.emitPartialGossip(peersToGossipByTopic)

    // Verify partial gossip was sent to nodeB
    const sentToB = sentRpcs.filter(s => s.peerId === bId && s.rpc.partial != null)
    expect(sentToB.length).to.be.greaterThan(0)
    expect(sentToB[0].rpc.partial?.partsMetadata).to.not.be.undefined()
  })

  it('should skip peers without partial support during partial gossip', async () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const state = gsA.partialMessageState.get(topic)
    state.updateMetadata(new Uint8Array([1]), ctx.nodeA.components.peerId.toString(), new Uint8Array([0b1010]))

    // Do NOT set any peerPartialOpts for nodeB

    // Spy on sendRpc
    const sentRpcs: Array<{ peerId: string, rpc: RPC }> = []
    const origSendRpc = gsA.sendRpc.bind(gsA)
    gsA.sendRpc = (id: string, rpc: RPC): boolean => {
      sentRpcs.push({ peerId: id, rpc })
      return origSendRpc(id, rpc)
    }

    const peersToGossipByTopic = new Map<string, Set<string>>()
    peersToGossipByTopic.set(topic, new Set([bId]))

    gsA.emitPartialGossip(peersToGossipByTopic)

    // No partial RPC should be sent
    const sentToB = sentRpcs.filter(s => s.peerId === bId && s.rpc.partial != null)
    expect(sentToB.length).to.equal(0)
  })

  it('should prune expired partial message groups during heartbeat', async () => {
    const sandbox = sinon.createSandbox()
    try {
      sandbox.useFakeTimers()

      const topic = 'test-topic'
      const gsA = ctx.nodeA.pubsub as any

      ctx.nodeA.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      const state = gsA.partialMessageState.get(topic)
      state.updateMetadata(new Uint8Array([1]), 'peer1', new Uint8Array([0b1010]))

      expect(state.size).to.equal(1)

      // Advance past the default group TTL (2 minutes)
      sandbox.clock.tick(3 * 60 * 1000)

      // Pruning happens in heartbeat - call pruneExpired directly
      state.pruneExpired()

      expect(state.size).to.equal(0)
    } finally {
      sandbox.restore()
    }
  })

  it('should gossip metadata for all tracked groups per topic', async () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const state = gsA.partialMessageState.get(topic)
    // Add two groups
    state.updateMetadata(new Uint8Array([1]), ctx.nodeA.components.peerId.toString(), new Uint8Array([0b1010]))
    state.updateMetadata(new Uint8Array([2]), ctx.nodeA.components.peerId.toString(), new Uint8Array([0b0101]))

    // Set nodeB as partial-supporting
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

    const peersToGossipByTopic = new Map<string, Set<string>>()
    peersToGossipByTopic.set(topic, new Set([bId]))

    gsA.emitPartialGossip(peersToGossipByTopic)

    // Should have sent one partial RPC per group (2 groups)
    const sentToB = sentRpcs.filter(s => s.peerId === bId && s.rpc.partial != null)
    expect(sentToB.length).to.equal(2)
  })

  it('should not send IHAVE to peers that request partial messages', () => {
    const topic = 'test-topic'
    const bId = ctx.nodeB.components.peerId.toString()
    const gsA = ctx.nodeA.pubsub as any

    gsA.peerPartialOpts.set(bId, new Map())
    gsA.peerPartialOpts.get(bId).set(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    } as PartialSubscriptionOpts)

    const pushedIHave: Array<{ peerId: string }> = []
    const originalPushGossip = gsA.pushGossip.bind(gsA)
    gsA.pushGossip = (peerId: string, controlIHaveMsgs: unknown) => {
      pushedIHave.push({ peerId })
      return originalPushGossip(peerId, controlIHaveMsgs)
    }

    gsA.doEmitGossip(topic, new Set([bId]), [new Uint8Array([1, 2, 3])])

    expect(pushedIHave).to.have.length(0)
  })

  it('should prune partial group state during heartbeat execution', async () => {
    const topic = 'test-topic'
    const gsA = ctx.nodeA.pubsub as any

    ctx.nodeA.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const state = gsA.partialMessageState.get(topic)
    state.updateMetadata(new Uint8Array([1]), 'peer1', new Uint8Array([0b1010]))

    const pruneSpy = sinon.spy(state, 'pruneExpired')
    await gsA.heartbeat()

    expect(pruneSpy.called).to.be.true()
  })
})
