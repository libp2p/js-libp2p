import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { MaxLengthError } from 'protons-runtime'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { decodeRpc, defaultDecodeRpcLimits } from '../src/message/decodeRpc.ts'
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

  it('keeps the default for each limit left out of decodeRpcLimits', async () => {
    const partial = await createComponents({ init: { decodeRpcLimits: { maxIhaveMessageIDs: 5, maxControlMessageIDs: undefined } } })
    try {
      const decode = (control: Partial<RPC.ControlMessage>): RPC => (partial.pubsub as any).decodeRpc(
        RPC.encode({ subscriptions: [], messages: [], control: { ihave: [], iwant: [], graft: [], prune: [], idontwant: [], ...control } })
      )
      const fullIwant = (): RPC.ControlIWant => ({ messageIDs: ids(defaultDecodeRpcLimits.maxIwantMessageIDs) })

      expect(() => decode({ ihave: [{ topicID: TOPIC, messageIDs: ids(6) }] })).to.throw(MaxLengthError)
      expect(() => decode({ iwant: [{ messageIDs: ids(defaultDecodeRpcLimits.maxIwantMessageIDs + 1) }] })).to.throw(MaxLengthError)
      expect(() => decode({ iwant: Array.from({ length: 11 }, fullIwant) })).to.throw(MaxLengthError)
      expect(decode({ iwant: Array.from({ length: 10 }, fullIwant) }).control?.iwant).to.have.length(10)
    } finally {
      await stop(partial.pubsub, ...Object.values(partial.components))
    }
  })
})

describe('decodeRpc maxControlMessageIDs', () => {
  const limits = { ...defaultDecodeRpcLimits, maxControlMessageIDs: 10 }

  function encode (control: Partial<RPC.ControlMessage>, rpc: Partial<RPC> = {}): Uint8Array {
    return RPC.encode({ subscriptions: [], messages: [], ...rpc, control: { ihave: [], iwant: [], graft: [], prune: [], idontwant: [], ...control } })
  }

  it('counts IHAVE, IWANT and IDONTWANT message IDs against one budget', () => {
    const bytes = encode({
      ihave: [{ topicID: TOPIC, messageIDs: ids(4) }],
      iwant: [{ messageIDs: ids(4) }],
      idontwant: [{ messageIDs: ids(3) }]
    })
    expect(() => decodeRpc(bytes, limits)).to.throw(MaxLengthError)
  })

  it('counts message IDs across repeated control fields', () => {
    const bytes = uint8ArrayConcat([
      encode({ ihave: [{ topicID: TOPIC, messageIDs: ids(4) }] }),
      encode({ iwant: [{ messageIDs: ids(4) }] }),
      encode({ idontwant: [{ messageIDs: ids(3) }] })
    ])
    expect(() => decodeRpc(bytes, limits)).to.throw(MaxLengthError)

    const idontwantFirst = uint8ArrayConcat([
      encode({ idontwant: [{ messageIDs: ids(4) }, { messageIDs: ids(4) }] }),
      encode({ ihave: [{ topicID: TOPIC, messageIDs: ids(3) }] })
    ])
    expect(() => decodeRpc(idontwantFirst, limits)).to.throw(MaxLengthError)
  })

  it('decodes an RPC at the budget like RPC.decode', () => {
    const bytes = encode({
      ihave: [{ topicID: TOPIC, messageIDs: ids(2) }, { topicID: TOPIC, messageIDs: ids(2) }],
      iwant: [{ messageIDs: ids(3) }],
      graft: [{ topicID: TOPIC }],
      prune: [{ topicID: TOPIC, peers: [{ peerID: Uint8Array.from([1]) }], backoff: 60 }],
      idontwant: [{ messageIDs: ids(3) }]
    }, {
      subscriptions: [{ subscribe: true, topic: TOPIC }],
      messages: [{ topic: TOPIC, data: Uint8Array.from([1, 2, 3]) }]
    })
    expect(decodeRpc(bytes, limits)).to.deep.equal(RPC.decode(bytes))

    const repeated = uint8ArrayConcat([encode({ iwant: [{ messageIDs: ids(5) }] }), encode({ idontwant: [{ messageIDs: ids(5) }] })])
    expect(decodeRpc(repeated, limits)).to.deep.equal(RPC.decode(repeated))
  })

  it('decodes the default budget of full IHAVE entries and rejects one more message ID', () => {
    const ihave = Array.from({ length: 10 }, () => ({ topicID: TOPIC, messageIDs: ids(defaultDecodeRpcLimits.maxIhaveMessageIDs) }))
    expect(decodeRpc(encode({ ihave }), defaultDecodeRpcLimits).control?.ihave).to.have.length(10)
    expect(() => decodeRpc(encode({ ihave, iwant: [{ messageIDs: ids(1) }] }), defaultDecodeRpcLimits)).to.throw(MaxLengthError)
  })
})
