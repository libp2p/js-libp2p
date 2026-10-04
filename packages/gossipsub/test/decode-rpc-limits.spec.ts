import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { MaxLengthError } from 'protons-runtime'
import { RPC } from '../src/message/rpc.ts'
import { createComponents } from './utils/create-pubsub.ts'
import type { GossipSubAndComponents } from './utils/create-pubsub.ts'

const TOPIC = 'decode-limits-topic'

// deterministic distinct ids, 4 bytes each
function ids (n: number): Uint8Array[] {
  return Array.from({ length: n }, (_, i) => Uint8Array.from([i & 0xff, (i >> 8) & 0xff, 1, 2]))
}

describe('decodeRpcLimits applied to control messages', () => {
  let node: GossipSubAndComponents

  beforeEach(async () => {
    node = await createComponents({
      init: {
        decodeRpcLimits: {
          maxSubscriptions: 10,
          maxMessages: 10,
          maxIhaveMessageIDs: 5,
          maxIwantMessageIDs: 5,
          maxIdontwantMessageIDs: 5,
          maxControlMessages: 4,
          maxPeerInfos: 4
        }
      }
    })
  })

  afterEach(async () => {
    await stop(node.pubsub, ...Object.values(node.components))
  })

  it('rejects an IHAVE entry whose messageIDs exceed maxIhaveMessageIDs', () => {
    const bytes = RPC.encode({
      subscriptions: [],
      messages: [],
      control: { ihave: [{ topicID: TOPIC, messageIDs: ids(6) }], iwant: [], graft: [], prune: [], idontwant: [] }
    })
    expect(() => (node.pubsub as any).decodeRpc(bytes)).to.throw(MaxLengthError)
  })

  it('rejects an IWANT entry whose messageIDs exceed maxIwantMessageIDs', () => {
    const bytes = RPC.encode({
      subscriptions: [],
      messages: [],
      control: { ihave: [], iwant: [{ messageIDs: ids(6) }], graft: [], prune: [], idontwant: [] }
    })
    expect(() => (node.pubsub as any).decodeRpc(bytes)).to.throw(MaxLengthError)
  })

  it('rejects an IDONTWANT entry whose messageIDs exceed maxIdontwantMessageIDs', () => {
    const bytes = RPC.encode({
      subscriptions: [],
      messages: [],
      control: { ihave: [], iwant: [], graft: [], prune: [], idontwant: [{ messageIDs: ids(6) }] }
    })
    expect(() => (node.pubsub as any).decodeRpc(bytes)).to.throw(MaxLengthError)
  })

  it('rejects a PRUNE entry whose peers exceed maxPeerInfos', () => {
    const peers = Array.from({ length: 5 }, (_, i) => ({ peerID: Uint8Array.from([i]) }))
    const bytes = RPC.encode({
      subscriptions: [],
      messages: [],
      control: { ihave: [], iwant: [], graft: [], prune: [{ topicID: TOPIC, peers }], idontwant: [] }
    })
    expect(() => (node.pubsub as any).decodeRpc(bytes)).to.throw(MaxLengthError)
  })

  it('rejects more IHAVE entries than maxControlMessages', () => {
    const ihave = Array.from({ length: 5 }, () => ({ topicID: TOPIC, messageIDs: ids(1) }))
    const bytes = RPC.encode({ subscriptions: [], messages: [], control: { ihave, iwant: [], graft: [], prune: [], idontwant: [] } })
    expect(() => (node.pubsub as any).decodeRpc(bytes)).to.throw(MaxLengthError)
  })

  it('decodes a within-limits control RPC', () => {
    const bytes = RPC.encode({
      subscriptions: [],
      messages: [],
      control: { ihave: [{ topicID: TOPIC, messageIDs: ids(5) }], iwant: [], graft: [], prune: [], idontwant: [] }
    })
    const rpc = (node.pubsub as any).decodeRpc(bytes)
    expect(rpc.control?.ihave[0]?.messageIDs).to.have.length(5)
  })

  it('rejects an IHAVE frame exceeding the default maxIhaveMessageIDs', async () => {
    const dflt = await createComponents({ init: {} })
    try {
      const bytes = RPC.encode({
        subscriptions: [],
        messages: [],
        control: { ihave: [{ topicID: TOPIC, messageIDs: ids(5001) }], iwant: [], graft: [], prune: [], idontwant: [] }
      })
      expect(() => (dflt.pubsub as any).decodeRpc(bytes)).to.throw(MaxLengthError)
    } finally {
      await stop(dflt.pubsub, ...Object.values(dflt.components))
    }
  })
})
