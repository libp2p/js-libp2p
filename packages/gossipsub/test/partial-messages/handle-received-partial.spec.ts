import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { PartialMessagesMaxMetadataSize } from '../../src/constants.js'
import { defaultDecodeRpcLimits } from '../../src/message/decodeRpc.js'
import { RPC } from '../../src/message/rpc.js'
import { createComponents } from '../utils/create-pubsub.js'
import { setupTwoNodes, teardownTwoNodes } from './utils.js'
import type { TwoNodeContext } from './utils.js'
import type { PartialMessage } from '../../src/types.js'

describe('partial messages - handleReceivedPartial', () => {
  let ctx: TwoNodeContext

  beforeEach(async () => {
    ctx = await setupTwoNodes()
  })

  afterEach(async () => {
    await teardownTwoNodes(ctx)
  })

  it('should dispatch partial-message event when receiving partial RPC', async () => {
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any

    // Subscribe nodeB with partial support so it has the state
    ctx.nodeB.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const topicIDBytes = new TextEncoder().encode(topic)

    // Set up listener for the partial-message event
    const received = new Promise<PartialMessage>((resolve) => {
      ctx.nodeB.pubsub.addEventListener('gossipsub:partial-message', (evt: CustomEvent<PartialMessage>) => {
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

    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, partialRpc)

    const msg = await received
    expect(msg.topic).to.equal(topic)
    expect(msg.groupID).to.deep.equal(new Uint8Array([1, 2, 3]))
    expect(msg.partsMetadata).to.deep.equal(new Uint8Array([0b1010]))
  })

  it('should update PartialMessageState when receiving partial RPC', async () => {
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any

    // Subscribe nodeB with partial support
    ctx.nodeB.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const topicIDBytes = new TextEncoder().encode(topic)

    // Simulate receiving a partial RPC
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
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

  it('should reject partial messages with missing topicID', () => {
    const gsB = ctx.nodeB.pubsub as any

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
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, partialRpc)

    // No state should be created
    expect(gsB.partialMessageState.size).to.equal(0)
  })

  it('should reject partial messages with missing groupID', () => {
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any

    ctx.nodeB.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const topicIDBytes = new TextEncoder().encode(topic)

    const partialRpc: RPC = {
      subscriptions: [],
      messages: [],
      partial: {
        topicID: topicIDBytes,
        // Missing groupID
        partsMetadata: new Uint8Array([0b1010])
      }
    }

    let eventFired = false
    ctx.nodeB.pubsub.addEventListener('gossipsub:partial-message', () => {
      eventFired = true
    }, { once: true })

    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, partialRpc)

    // No event should be dispatched
    expect(eventFired).to.be.false()
  })

  it('should reject partial messages with missing partsMetadata', () => {
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any

    ctx.nodeB.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const topicIDBytes = new TextEncoder().encode(topic)

    const partialRpc: RPC = {
      subscriptions: [],
      messages: [],
      partial: {
        topicID: topicIDBytes,
        groupID: new Uint8Array([1, 2])
        // Missing partsMetadata
      }
    }

    let eventFired = false
    ctx.nodeB.pubsub.addEventListener('gossipsub:partial-message', () => {
      eventFired = true
    }, { once: true })

    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, partialRpc)

    // No event should be dispatched
    expect(eventFired).to.be.false()
  })

  it('should reject partial messages with oversized partsMetadata', () => {
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any

    ctx.nodeB.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const topicIDBytes = new TextEncoder().encode(topic)

    // Create metadata that exceeds the max size
    const oversizedMetadata = new Uint8Array(PartialMessagesMaxMetadataSize + 1)

    const partialRpc: RPC = {
      subscriptions: [],
      messages: [],
      partial: {
        topicID: topicIDBytes,
        groupID: new Uint8Array([1, 2]),
        partsMetadata: oversizedMetadata
      }
    }

    let eventFired = false
    ctx.nodeB.pubsub.addEventListener('gossipsub:partial-message', () => {
      eventFired = true
    }, { once: true })

    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, partialRpc)

    // Should be silently ignored
    expect(eventFired).to.be.false()
    const state = gsB.partialMessageState.get(topic)
    expect(state?.hasGroup(new Uint8Array([1, 2]))).to.not.be.true()
  })

  it('should reject partial messages with oversized partialMessage', async () => {
    const limitedNode = await createComponents({
      init: {
        emitSelf: false,
        decodeRpcLimits: {
          ...defaultDecodeRpcLimits,
          maxPartialMessageSize: 1
        }
      }
    })

    try {
      const gsLimited = limitedNode.pubsub as any
      const topic = 'test-topic'

      limitedNode.pubsub.subscribePartial(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      const topicIDBytes = new TextEncoder().encode(topic)
      let eventFired = false
      limitedNode.pubsub.addEventListener('gossipsub:partial-message', () => {
        eventFired = true
      }, { once: true })

      await gsLimited.handleReceivedRpc(ctx.nodeA.components.peerId, {
        subscriptions: [],
        messages: [],
        partial: {
          topicID: topicIDBytes,
          groupID: new Uint8Array([1, 2]),
          partialMessage: new Uint8Array([4, 5]), // exceeds maxPartialMessageSize
          partsMetadata: new Uint8Array([0b1010])
        }
      })

      expect(eventFired).to.be.false()
      const state = gsLimited.partialMessageState.get(topic)
      expect(state?.hasGroup(new Uint8Array([1, 2]))).to.not.be.true()
    } finally {
      await stop(limitedNode.pubsub, ...Object.entries(limitedNode.components))
    }
  })

  it('should ignore partial for topic not subscribed with partial support', () => {
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any

    // Subscribe normally, not via subscribePartial
    ctx.nodeB.pubsub.subscribe(topic)

    const topicIDBytes = new TextEncoder().encode(topic)

    let eventFired = false
    ctx.nodeB.pubsub.addEventListener('gossipsub:partial-message', () => {
      eventFired = true
    }, { once: true })

    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [],
      messages: [],
      partial: {
        topicID: topicIDBytes,
        groupID: new Uint8Array([1, 2]),
        partsMetadata: new Uint8Array([0b1010])
      }
    })

    // Should be ignored - topic is not in partialTopics
    expect(eventFired).to.be.false()
    expect(gsB.partialMessageState.has(topic)).to.be.false()
  })

  it('should ignore partial for disallowed topic', async () => {
    // Create a node with allowedTopics
    const restrictedNode = await createComponents({
      init: {
        emitSelf: false,
        allowedTopics: ['allowed-topic']
      }
    })

    try {
      const gsRestricted = restrictedNode.pubsub as any
      const topic = 'disallowed-topic'

      // Subscribe with partial to the disallowed topic (bypassing normal checks for test)
      restrictedNode.pubsub.partialTopics.set(topic, {
        requestsPartial: true,
        supportsSendingPartial: true
      })

      const topicIDBytes = new TextEncoder().encode(topic)

      let eventFired = false
      restrictedNode.pubsub.addEventListener('gossipsub:partial-message', () => {
        eventFired = true
      }, { once: true })

      gsRestricted.handleReceivedRpc(ctx.nodeA.components.peerId, {
        subscriptions: [],
        messages: [],
        partial: {
          topicID: topicIDBytes,
          groupID: new Uint8Array([1, 2]),
          partsMetadata: new Uint8Array([0b1010])
        }
      })

      expect(eventFired).to.be.false()
    } finally {
      await stop(restrictedNode.pubsub, ...Object.entries(restrictedNode.components))
    }
  })

  it('should dispatch event for metadata-only partial (no partialMessage)', async () => {
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any

    ctx.nodeB.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const topicIDBytes = new TextEncoder().encode(topic)

    const received = new Promise<PartialMessage>((resolve) => {
      ctx.nodeB.pubsub.addEventListener('gossipsub:partial-message', (evt: CustomEvent<PartialMessage>) => {
        resolve(evt.detail)
      }, { once: true })
    })

    // Send partial with partsMetadata only, no partialMessage
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [],
      messages: [],
      partial: {
        topicID: topicIDBytes,
        groupID: new Uint8Array([1, 2, 3]),
        partsMetadata: new Uint8Array([0b1010])
      }
    })

    const msg = await received
    expect(msg.topic).to.equal(topic)
    expect(msg.groupID).to.deep.equal(new Uint8Array([1, 2, 3]))
    expect(msg.partsMetadata).to.deep.equal(new Uint8Array([0b1010]))
    expect(msg.partialMessage).to.be.undefined()
  })

  it('should include partialMessage data in dispatched event when present', async () => {
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any

    ctx.nodeB.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const topicIDBytes = new TextEncoder().encode(topic)

    const received = new Promise<PartialMessage>((resolve) => {
      ctx.nodeB.pubsub.addEventListener('gossipsub:partial-message', (evt: CustomEvent<PartialMessage>) => {
        resolve(evt.detail)
      }, { once: true })
    })

    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [],
      messages: [],
      partial: {
        topicID: topicIDBytes,
        groupID: new Uint8Array([1, 2, 3]),
        partialMessage: new Uint8Array([4, 5, 6]),
        partsMetadata: new Uint8Array([0b1010])
      }
    })

    const msg = await received
    expect(msg.partialMessage).to.deep.equal(new Uint8Array([4, 5, 6]))
  })

  it('should dispatch event from non-mesh peer', async () => {
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any

    ctx.nodeB.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    // Ensure nodeA is NOT in nodeB's mesh for this topic
    const aId = ctx.nodeA.components.peerId.toString()
    const mesh = gsB.mesh.get(topic)
    if (mesh != null) {
      mesh.delete(aId)
    }

    const topicIDBytes = new TextEncoder().encode(topic)

    const received = new Promise<PartialMessage>((resolve) => {
      ctx.nodeB.pubsub.addEventListener('gossipsub:partial-message', (evt: CustomEvent<PartialMessage>) => {
        resolve(evt.detail)
      }, { once: true })
    })

    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [],
      messages: [],
      partial: {
        topicID: topicIDBytes,
        groupID: new Uint8Array([1, 2, 3]),
        partsMetadata: new Uint8Array([0b1010])
      }
    })

    // Event should still be dispatched regardless of mesh membership
    const msg = await received
    expect(msg.topic).to.equal(topic)
    expect(msg.groupID).to.deep.equal(new Uint8Array([1, 2, 3]))
  })

  it('should replace peer metadata on subsequent updates for same group', async () => {
    const topic = 'test-topic'
    const gsB = ctx.nodeB.pubsub as any
    const aId = ctx.nodeA.components.peerId.toString()

    ctx.nodeB.pubsub.subscribePartial(topic, {
      requestsPartial: true,
      supportsSendingPartial: true
    })

    const topicIDBytes = new TextEncoder().encode(topic)

    // First update
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [],
      messages: [],
      partial: {
        topicID: topicIDBytes,
        groupID: new Uint8Array([1, 2]),
        partsMetadata: new Uint8Array([0b1010])
      }
    })

    const state = gsB.partialMessageState.get(topic)
    expect(state.getPeerMetadata(new Uint8Array([1, 2]), aId)).to.deep.equal(new Uint8Array([0b1010]))

    // Second update from same peer, same group, different metadata
    gsB.handleReceivedRpc(ctx.nodeA.components.peerId, {
      subscriptions: [],
      messages: [],
      partial: {
        topicID: topicIDBytes,
        groupID: new Uint8Array([1, 2]),
        partsMetadata: new Uint8Array([0b0101])
      }
    })

    // Peer metadata should be replaced with the latest
    expect(state.getPeerMetadata(new Uint8Array([1, 2]), aId)).to.deep.equal(new Uint8Array([0b0101]))
    // Local metadata should be the merge of all received
    expect(state.getLocalMetadata(new Uint8Array([1, 2]))).to.deep.equal(new Uint8Array([0b1111]))
  })
})
