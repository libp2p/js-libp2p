import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { GossipsubMaxIHaveLength, GossipsubMaxIWantMessages } from '../src/constants.ts'
import { createComponents } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'

const TOPIC = 'iteration-bound-topic'

function randomIds (n: number): Uint8Array[] {
  return Array.from({ length: n }, () => {
    const a = new Uint8Array(8)
    crypto.getRandomValues(a)
    return a
  })
}

describe('handleIHave bounds iteration', () => {
  let node: GossipSubAndComponents

  beforeEach(async () => {
    node = await createComponents({ init: {} })
  })

  afterEach(async () => {
    await stop(node.pubsub, ...Object.values(node.components))
  })

  it('stops processing message ids at GossipsubMaxIHaveLength', () => {
    const gs = node.pubsub as any
    // a mesh entry is required for handleIHave to iterate the entry's ids
    gs.mesh.set(TOPIC, new Set())

    const orig = gs.msgIdToStrFn.bind(gs)
    let calls = 0
    gs.msgIdToStrFn = (mid: Uint8Array) => { calls++; return orig(mid) }

    gs.handleIHave('remote-peer', [{ topicID: TOPIC, messageIDs: randomIds(GossipsubMaxIHaveLength * 2) }])

    expect(calls).to.be.lessThanOrEqual(GossipsubMaxIHaveLength)
  })
})

describe('handleIWant bounds iteration and rate', () => {
  let node: GossipSubAndComponents

  beforeEach(async () => {
    node = await createComponents({ init: {} })
  })

  afterEach(async () => {
    await stop(node.pubsub, ...Object.values(node.components))
  })

  it('stops processing message ids at GossipsubMaxIHaveLength', () => {
    const gs = node.pubsub as any
    const orig = gs.msgIdToStrFn.bind(gs)
    let calls = 0
    gs.msgIdToStrFn = (mid: Uint8Array) => { calls++; return orig(mid) }

    gs.handleIWant('remote-peer', [{ messageIDs: randomIds(GossipsubMaxIHaveLength * 2) }])

    expect(calls).to.be.lessThanOrEqual(GossipsubMaxIHaveLength)
  })

  it('ignores IWANT after GossipsubMaxIWantMessages within a heartbeat', () => {
    const gs = node.pubsub as any
    const orig = gs.msgIdToStrFn.bind(gs)
    let calls = 0
    gs.msgIdToStrFn = (mid: Uint8Array) => { calls++; return orig(mid) }

    for (let i = 0; i < GossipsubMaxIWantMessages; i++) {
      gs.handleIWant('remote-peer', [{ messageIDs: randomIds(1) }])
    }
    const callsAfterLimit = calls

    // one more, over the per-heartbeat limit -> ignored, no further processing
    gs.handleIWant('remote-peer', [{ messageIDs: randomIds(1) }])

    expect(calls).to.equal(callsAfterLimit)
  })

  it('serves IWANT again after the heartbeat resets the counter', async () => {
    const gs = node.pubsub as any
    const orig = gs.msgIdToStrFn.bind(gs)
    let calls = 0
    gs.msgIdToStrFn = (mid: Uint8Array) => { calls++; return orig(mid) }

    // use up the per-heartbeat budget, then one more that is ignored
    for (let i = 0; i < GossipsubMaxIWantMessages; i++) {
      gs.handleIWant('remote-peer', [{ messageIDs: randomIds(1) }])
    }
    gs.handleIWant('remote-peer', [{ messageIDs: randomIds(1) }])
    const callsBeforeHeartbeat = calls

    // heartbeat clears iwantCounts
    await gs.heartbeat()

    // peer is served again
    gs.handleIWant('remote-peer', [{ messageIDs: randomIds(1) }])
    expect(calls).to.be.greaterThan(callsBeforeHeartbeat)
  })
})
