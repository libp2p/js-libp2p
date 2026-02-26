import { stop } from '@libp2p/interface'
import { createComponents, connectPubsubNodes } from '../utils/create-pubsub.js'
import type { GossipSubAndComponents } from '../utils/create-pubsub.js'

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
  return { nodeA, nodeB }
}

export async function teardownTwoNodes (ctx: TwoNodeContext): Promise<void> {
  await stop(ctx.nodeA.pubsub, ...Object.entries(ctx.nodeA.components))
  await stop(ctx.nodeB.pubsub, ...Object.entries(ctx.nodeB.components))
}
