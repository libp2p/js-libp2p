import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { GossipsubMaxPruneBackoff } from '../src/constants.ts'
import { createComponents } from './utils/create-pubsub.ts'
import { createPeerId } from './utils/index.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'

const TOPIC = 'prune-topic'

describe('handlePrune', () => {
  let node: GossipSubAndComponents
  let peer: string

  beforeEach(async () => {
    node = await createComponents({ init: {} })
    peer = (await createPeerId()).toString()
  })

  afterEach(async () => {
    await stop(node.pubsub, ...Object.values(node.components))
  })

  it('caps the backoff accepted from a peer at GossipsubMaxPruneBackoff', async () => {
    const gs = node.pubsub as any
    gs.mesh.set(TOPIC, new Set([peer]))

    const before = Date.now()
    await gs.handlePrune(peer, [{ topicID: TOPIC, peers: [], backoff: Number.MAX_SAFE_INTEGER }])
    const after = Date.now()

    const expire = gs.backoff.get(TOPIC)?.get(peer)
    expect(expire).to.be.at.least(before + GossipsubMaxPruneBackoff)
    expect(expire).to.be.at.most(after + GossipsubMaxPruneBackoff)
  })

  it('processes remaining entries after a topic that is not in the mesh', async () => {
    const gs = node.pubsub as any
    gs.mesh.set(TOPIC, new Set([peer]))

    await gs.handlePrune(peer, [
      { topicID: 'not-joined-topic', peers: [] },
      { topicID: TOPIC, peers: [] }
    ])

    expect(node.pubsub.mesh.get(TOPIC)?.has(peer)).to.equal(false)
    expect(gs.backoff.get(TOPIC)?.has(peer)).to.equal(true)
  })
})
