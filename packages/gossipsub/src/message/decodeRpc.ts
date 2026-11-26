import { MaxLengthError, reader as createReader } from 'protons-runtime'
import { RPC } from './rpc.ts'
import type { Reader } from 'protons-runtime'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface DecodeRPCLimits {
  maxSubscriptions: number
  maxMessages: number
  maxIhaveMessageIDs: number
  maxIwantMessageIDs: number
  maxIdontwantMessageIDs: number
  maxControlMessages: number
  maxPeerInfos: number
  /**
   * Total message IDs across all IHAVE, IWANT and IDONTWANT entries of one RPC
   */
  maxControlMessageIDs: number
}

export const defaultDecodeRpcLimits: DecodeRPCLimits = {
  // 5000 = GossipsubMaxIHaveLength, used as a generous upper bound for these
  maxSubscriptions: 5000,
  maxMessages: 5000,
  maxIhaveMessageIDs: 5000,
  maxIwantMessageIDs: 5000,
  maxControlMessages: 5000,
  maxIdontwantMessageIDs: 512, // GossipsubIdontwantMaxMessages
  maxPeerInfos: 16, // GossipsubPrunePeers
  maxControlMessageIDs: 50000 // 10 * GossipsubMaxIHaveLength, room for full IHAVEs on several topics
}

/**
 * Fills in the default for each limit left out, a missing limit would otherwise disable its check
 */
export function withDefaultDecodeRpcLimits (limits: Partial<DecodeRPCLimits> = {}): DecodeRPCLimits {
  return {
    maxSubscriptions: limits.maxSubscriptions ?? defaultDecodeRpcLimits.maxSubscriptions,
    maxMessages: limits.maxMessages ?? defaultDecodeRpcLimits.maxMessages,
    maxIhaveMessageIDs: limits.maxIhaveMessageIDs ?? defaultDecodeRpcLimits.maxIhaveMessageIDs,
    maxIwantMessageIDs: limits.maxIwantMessageIDs ?? defaultDecodeRpcLimits.maxIwantMessageIDs,
    maxIdontwantMessageIDs: limits.maxIdontwantMessageIDs ?? defaultDecodeRpcLimits.maxIdontwantMessageIDs,
    maxControlMessages: limits.maxControlMessages ?? defaultDecodeRpcLimits.maxControlMessages,
    maxPeerInfos: limits.maxPeerInfos ?? defaultDecodeRpcLimits.maxPeerInfos,
    maxControlMessageIDs: limits.maxControlMessageIDs ?? defaultDecodeRpcLimits.maxControlMessageIDs
  }
}

/**
 * Same as `RPC.decode` with `limits`, plus `maxControlMessageIDs`. The generated decoder limits each
 * control entry on its own, so each entry is decoded with the remaining budget as its limit instead.
 */
export function decodeRpc (bytes: Uint8Array | Uint8ArrayList, limits: DecodeRPCLimits): RPC {
  const reader = createReader(bytes)
  const budget = { messageIDs: limits.maxControlMessageIDs }
  const rpc: RPC = { subscriptions: [], messages: [] }

  while (reader.pos < reader.len) {
    const tag = reader.uint32()

    switch (tag >>> 3) {
      case 1: {
        if (rpc.subscriptions.length === limits.maxSubscriptions) {
          throw new MaxLengthError('Decode error - repeated field "subscriptions" had too many elements')
        }

        rpc.subscriptions.push(RPC.SubOpts.codec().decode(reader, reader.uint32()))
        break
      }
      case 2: {
        if (rpc.messages.length === limits.maxMessages) {
          throw new MaxLengthError('Decode error - repeated field "messages" had too many elements')
        }

        rpc.messages.push(RPC.Message.codec().decode(reader, reader.uint32()))
        break
      }
      case 3: {
        // a repeated control field replaces the previous one, but the budget is shared
        rpc.control = decodeControlMessage(reader, reader.uint32(), limits, budget)
        break
      }
      default: {
        reader.skipType(tag & 7)
        break
      }
    }
  }

  return rpc
}

function decodeControlMessage (reader: Reader, length: number, limits: DecodeRPCLimits, budget: { messageIDs: number }): RPC.ControlMessage {
  const control: RPC.ControlMessage = { ihave: [], iwant: [], graft: [], prune: [], idontwant: [] }
  const end = reader.pos + length

  while (reader.pos < end) {
    const tag = reader.uint32()

    switch (tag >>> 3) {
      case 1: {
        if (control.ihave.length === limits.maxControlMessages) {
          throw new MaxLengthError('Decode error - repeated field "ihave" had too many elements')
        }

        const ihave = RPC.ControlIHave.codec().decode(reader, reader.uint32(), {
          limits: { messageIDs: Math.min(limits.maxIhaveMessageIDs, budget.messageIDs) }
        })
        budget.messageIDs -= ihave.messageIDs.length
        control.ihave.push(ihave)
        break
      }
      case 2: {
        if (control.iwant.length === limits.maxControlMessages) {
          throw new MaxLengthError('Decode error - repeated field "iwant" had too many elements')
        }

        const iwant = RPC.ControlIWant.codec().decode(reader, reader.uint32(), {
          limits: { messageIDs: Math.min(limits.maxIwantMessageIDs, budget.messageIDs) }
        })
        budget.messageIDs -= iwant.messageIDs.length
        control.iwant.push(iwant)
        break
      }
      case 3: {
        if (control.graft.length === limits.maxControlMessages) {
          throw new MaxLengthError('Decode error - repeated field "graft" had too many elements')
        }

        control.graft.push(RPC.ControlGraft.codec().decode(reader, reader.uint32()))
        break
      }
      case 4: {
        if (control.prune.length === limits.maxControlMessages) {
          throw new MaxLengthError('Decode error - repeated field "prune" had too many elements')
        }

        control.prune.push(RPC.ControlPrune.codec().decode(reader, reader.uint32(), {
          limits: { peers: limits.maxPeerInfos }
        }))
        break
      }
      case 5: {
        if (control.idontwant.length === limits.maxControlMessages) {
          throw new MaxLengthError('Decode error - repeated field "idontwant" had too many elements')
        }

        const idontwant = RPC.ControlIDontWant.codec().decode(reader, reader.uint32(), {
          limits: { messageIDs: Math.min(limits.maxIdontwantMessageIDs, budget.messageIDs) }
        })
        budget.messageIDs -= idontwant.messageIDs.length
        control.idontwant.push(idontwant)
        break
      }
      default: {
        reader.skipType(tag & 7)
        break
      }
    }
  }

  return control
}
