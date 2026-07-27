import { stop } from '@libp2p/interface'
import pWaitFor from 'p-wait-for'
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

/**
 * Wait until `from` has learned over the wire that `to` subscribes to `topic`.
 *
 * Subscriptions propagate asynchronously after connect, so publishing before
 * this resolves silently reaches nobody.
 */
export async function waitForTopicPeer (
  from: GossipSubAndComponents,
  to: GossipSubAndComponents,
  topic: string
): Promise<void> {
  const gs = from.pubsub as any
  const toId = to.components.peerId.toString()

  await pWaitFor(() => gs.topics.get(topic)?.has(toId) ?? false, { timeout: 10000 })
}

/**
 * As {@link waitForTopicPeer}, but also waits for the peer's partial-message
 * options to arrive. Both facts are prerequisites for `publishPartial` to
 * target the peer, and both travel in SubOpts.
 */
export async function waitForPartialPeer (
  from: GossipSubAndComponents,
  to: GossipSubAndComponents,
  topic: string
): Promise<void> {
  const gs = from.pubsub as any
  const toId = to.components.peerId.toString()

  await pWaitFor(() => {
    return (gs.topics.get(topic)?.has(toId) ?? false) &&
      gs.peerPartialOpts.get(toId)?.get(topic) != null
  }, { timeout: 10000 })
}
