import { stop } from '@libp2p/interface'
import pWaitFor from 'p-wait-for'
import { createComponents, connectPubsubNodes } from '../utils/create-pubsub.js'
import type { GossipSubAndComponents } from '../utils/create-pubsub.js'

export async function waitForStreamsReady (a: GossipSubAndComponents, b: GossipSubAndComponents): Promise<void> {
  await pWaitFor(() => {
    const gsA = a.pubsub as any
    const gsB = b.pubsub as any
    const bId = b.components.peerId.toString()
    const aId = a.components.peerId.toString()
    return gsA.peers.has(bId) && gsB.peers.has(aId) &&
      gsA.streamsOutbound.has(bId) && gsB.streamsOutbound.has(aId)
  }, { timeout: 10000 })
}

export interface TwoNodeContext {
  nodeA: GossipSubAndComponents
  nodeB: GossipSubAndComponents
}

export async function setupTwoNodes (): Promise<TwoNodeContext> {
  const nodeA = await createComponents({
    init: {
      emitSelf: false
    }
  })
  const nodeB = await createComponents({
    init: {
      emitSelf: false
    }
  })
  await connectPubsubNodes(nodeA, nodeB)
  await waitForStreamsReady(nodeA, nodeB)
  return { nodeA, nodeB }
}

export async function teardownTwoNodes (ctx: TwoNodeContext): Promise<void> {
  await stop(ctx.nodeA.pubsub, ...Object.entries(ctx.nodeA.components))
  await stop(ctx.nodeB.pubsub, ...Object.entries(ctx.nodeB.components))
}
