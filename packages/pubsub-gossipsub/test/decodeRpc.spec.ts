import { expect } from 'aegir/chai'
import { decodeRpc, DecodeRPCLimits, defaultDecodeRpcLimits } from '../src/message/decodeRpc.js'
import { RPC, IRPC } from '../src/message/index.js'

describe('decodeRpc', () => {
  const topicID = 'topic'
  const msgID = new Uint8Array(8)

  const subscription: RPC.ISubOpts = { subscribe: true, topic: topicID }
  const message: RPC.IMessage = { topic: topicID, data: new Uint8Array(100) }
  const peerInfo: RPC.IPeerInfo = { peerID: msgID, signedPeerRecord: msgID }
  const ihave: RPC.IControlIHave = { topicID, messageIDs: [msgID] }
  const iwant: RPC.IControlIWant = { messageIDs: [msgID] }
  const graft: RPC.IControlGraft = { topicID }
  const prune: RPC.IControlPrune = { topicID, peers: [peerInfo] }

  describe('decode correctness', () => {
    it('Should decode full RPC', () => {
      const rpc: IRPC = {
        subscriptions: [subscription, subscription],
        messages: [message, message],
        control: {
          ihave: [ihave, ihave],
          iwant: [iwant, iwant],
          graft: [graft, graft],
          prune: [prune, prune]
        }
      }

      const bytes = RPC.encode(rpc).finish()

      // Compare as JSON
      expect(RPC.fromObject(decodeRpc(bytes, defaultDecodeRpcLimits)).toJSON()).deep.equals(RPC.decode(bytes).toJSON())
    })
  })

  describe('decode limits', () => {
    const decodeRpcLimits: DecodeRPCLimits = {
      maxSubscriptions: 2,
      maxMessages: 2,
      maxControlMessages: 2,
      maxIhaveMessageIDs: 3,
      maxIwantMessageIDs: 3,
      maxPeerInfos: 3
    }

    // Check no mutations on limits
    const limitsAfter = { ...decodeRpcLimits }

    after('decodeRpcLimits has not been mutated', () => {
      expect(limitsAfter).deep.equals(decodeRpcLimits)
    })

    const rpcEmpty: IRPC = {
      subscriptions: [],
      messages: [],
      control: {
        ihave: [],
        iwant: [],
        graft: [],
        prune: []
      }
    }

    const rpcEmptyBytes = RPC.encode(rpcEmpty).finish()

    it('limit subscriptions.length', () => {
      // Decode a fresh instance to allow safe mutations
      const rpc = RPC.decode(rpcEmptyBytes)
      rpc.subscriptions = [subscription, subscription, subscription]
      expect(endecode(rpc).subscriptions).length(decodeRpcLimits.maxSubscriptions)
    })

    it('limit messages.length', () => {
      const rpc = RPC.decode(rpcEmptyBytes)
      rpc.messages = [message, message, message]
      expect(endecode(rpc).messages).length(decodeRpcLimits.maxMessages)
    })

    it('limit control.ihave.length', () => {
      const rpc = RPC.decode(rpcEmptyBytes)
      rpc.control = { ihave: [ihave, ihave, ihave] }
      expect(endecode(rpc).control?.ihave).length(decodeRpcLimits.maxControlMessages)
    })

    it('limit control.iwant.length', () => {
      const rpc = RPC.decode(rpcEmptyBytes)
      rpc.control = { iwant: [iwant, iwant, iwant] }
      expect(endecode(rpc).control?.iwant).length(decodeRpcLimits.maxControlMessages)
    })

    it('limit control.graft.length', () => {
      const rpc = RPC.decode(rpcEmptyBytes)
      rpc.control = { graft: [graft, graft, graft] }
      expect(endecode(rpc).control?.graft).length(decodeRpcLimits.maxControlMessages)
    })

    it('limit control.prune.length', () => {
      const rpc = RPC.decode(rpcEmptyBytes)
      rpc.control = { prune: [prune, prune, prune] }
      expect(endecode(rpc).control?.prune).length(decodeRpcLimits.maxControlMessages)
    })

    it('limit ihave.messageIDs.length', () => {
      const rpc = RPC.decode(rpcEmptyBytes)
      // Limit to 3 items total, 2 (all) on the first one, 1 on the second one
      rpc.control = { ihave: [{ messageIDs: [msgID, msgID] }, { messageIDs: [msgID, msgID] }] }
      expect(decodeRpcLimits.maxIhaveMessageIDs).equals(3, 'Wrong maxIhaveMessageIDs')
      expect(endecode(rpc).control?.ihave?.[0].messageIDs).length(2, 'Wrong ihave?.[0].messageIDs len')
      expect(endecode(rpc).control?.ihave?.[1].messageIDs).length(1, 'Wrong ihave?.[1].messageIDs len')
    })

    it('limit iwant.messageIDs.length', () => {
      const rpc = RPC.decode(rpcEmptyBytes)
      // Limit to 3 items total, 2 (all) on the first one, 1 on the second one
      rpc.control = { iwant: [{ messageIDs: [msgID, msgID] }, { messageIDs: [msgID, msgID] }] }
      expect(decodeRpcLimits.maxIwantMessageIDs).equals(3, 'Wrong maxIwantMessageIDs')
      expect(endecode(rpc).control?.iwant?.[0].messageIDs).length(2, 'Wrong iwant?.[0].messageIDs len')
      expect(endecode(rpc).control?.iwant?.[1].messageIDs).length(1, 'Wrong iwant?.[1].messageIDs len')
    })

    it('limit prune.peers.length', () => {
      const rpc = RPC.decode(rpcEmptyBytes)
      // Limit to 3 items total, 2 (all) on the first one, 1 on the second one
      rpc.control = { prune: [{ peers: [peerInfo, peerInfo] }, { peers: [peerInfo, peerInfo] }] }
      expect(decodeRpcLimits.maxPeerInfos).equals(3, 'Wrong maxPeerInfos')
      expect(endecode(rpc).control?.prune?.[0].peers).length(2, 'Wrong prune?.[0].peers len')
      expect(endecode(rpc).control?.prune?.[1].peers).length(1, 'Wrong prune?.[1].peers len')
    })

    function endecode(rpc: IRPC): IRPC {
      return decodeRpc(RPC.encode(rpc).finish(), decodeRpcLimits)
    }
  })
})
