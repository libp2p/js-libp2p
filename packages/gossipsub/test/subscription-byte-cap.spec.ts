import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { GossipsubTopicEntryOverhead } from '../src/constants.ts'
import { connectAllPubSubNodes, createComponents, createComponentsArray } from './utils/create-pubsub.ts'
import { createPeerId } from './utils/index.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'
import type { PeerId } from '@libp2p/interface'

// each subscribed topic is charged its string length plus a fixed per-entry
// overhead, so budgets in these tests are expressed in units of that cost
const topicLength = 10
const perTopic = topicLength + GossipsubTopicEntryOverhead

describe('gossip / subscription byte cap', () => {
  let nodes: GossipSubAndComponents[]

  // five 10-byte topics; a budget for exactly three admits three and drops two
  const topics = Array.from({ length: 5 }, (_, i) => `topic${i}`.padEnd(topicLength, '0'))
  const maxTopicBytesPerPeer = perTopic * 3

  beforeEach(async () => {
    nodes = await createComponentsArray({
      number: 2,
      connected: false,
      init: {
        maxTopicBytesPerPeer
      }
    })
  })

  afterEach(async () => {
    await stop(...nodes.reduce<any[]>((acc, curr) => acc.concat(curr.pubsub, ...Object.entries(curr.components)), []))
  })

  it('drops a peer\'s subscriptions once its topic budget is exceeded', async function () {
    this.timeout(10 * 1000)
    const [nodeA, nodeB] = nodes

    for (const topic of topics) {
      nodeA.pubsub.subscribe(topic)
    }

    await Promise.all([
      connectAllPubSubNodes(nodes),
      pEvent(nodeB.pubsub, 'subscription-change')
    ])

    // nodeB stores only the three topics that fit within the budget, not all five
    const nodeBTopics = Array.from((nodeB.pubsub)['topics'].keys())
    expect(nodeBTopics.length).to.equal(3)
  })
})

describe('gossip / subscription byte cap accounting', () => {
  let node: GossipSubAndComponents
  let peer: PeerId
  const cap = perTopic * 2 // budget for exactly two topics

  beforeEach(async () => {
    node = await createComponents({ init: { maxTopicBytesPerPeer: cap } })
    peer = await createPeerId()
  })

  afterEach(async () => {
    await stop(node.pubsub, ...Object.values(node.components))
  })

  const topic = (i: number): string => `t${i}`.padEnd(topicLength, 'x') // distinct, 10 chars
  // call the private receive handler directly with a fixed remote peer
  const sub = (t: string, subscribe = true): boolean =>
    (node.pubsub as any).handleReceivedSubscription(peer, t, subscribe)
  const used = (): number => (node.pubsub as any).peerTopicBytes.get(peer.toString()) ?? 0
  const topicCount = (): number => (node.pubsub as any).topics.size

  it('does not double-charge a repeated subscribe to the same topic', () => {
    expect(sub(topic(0))).to.equal(true)
    expect(sub(topic(0))).to.equal(true) // idempotent re-announce
    expect(used()).to.equal(perTopic)
    expect(topicCount()).to.equal(1)
  })

  it('refunds a topic\'s cost on unsubscribe so the budget is freed', () => {
    expect(sub(topic(0))).to.equal(true) // 1x
    expect(sub(topic(1))).to.equal(true) // 2x (at cap)
    expect(sub(topic(2))).to.equal(false) // 3x > cap, rejected
    expect(used()).to.equal(perTopic * 2)

    expect(sub(topic(0), false)).to.equal(true) // unsubscribe, refund
    expect(used()).to.equal(perTopic)
    expect(sub(topic(2))).to.equal(true) // now fits again
    expect(used()).to.equal(perTopic * 2)
  })

  it('does not refund a topic the peer was never charged for (no cap bypass)', () => {
    expect(sub(topic(0))).to.equal(true)
    // unsubscribe from a never-subscribed topic must be a no-op, otherwise a
    // peer could erase its charges and exceed the cap
    expect(sub(topic(99), false)).to.equal(true)
    expect(used()).to.equal(perTopic)
  })

  it('accepts a subscription that exactly fills the budget and rejects one over', () => {
    expect(sub(topic(0))).to.equal(true) // 1x
    expect(sub(topic(1))).to.equal(true) // 2x, exactly the cap (pins > not >=)
    expect(used()).to.equal(perTopic * 2)
    expect(sub(topic(2))).to.equal(false) // one over
    expect(used()).to.equal(perTopic * 2)
  })
})
