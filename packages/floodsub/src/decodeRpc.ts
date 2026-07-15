import type { RPC } from './message/rpc.ts'
import type { DecodeOptions } from 'protons-runtime'

/**
 * Limits applied when decoding incoming RPC messages. A single RPC frame is
 * already byte-capped by the length-prefixed stream (see `maxDataLength`), but
 * that bounds bytes, not element counts - protobuf packs many small repeated
 * entries into a few bytes. These caps bound the number of decoded elements so
 * a single frame cannot expand into millions of objects.
 */
export interface DecodeRPCLimits {
  maxSubscriptions: number
  maxMessages: number
}

export const defaultDecodeRpcLimits: DecodeRPCLimits = {
  maxSubscriptions: 5000,
  maxMessages: 5000
}

export type RPCDecodeLimits = DecodeOptions<RPC>['limits']

/**
 * Map the flat {@link DecodeRPCLimits} onto the per-field limits the protons
 * codec expects.
 */
export function createRPCDecodeLimits (limits: DecodeRPCLimits): RPCDecodeLimits {
  return {
    subscriptions: limits.maxSubscriptions,
    messages: limits.maxMessages
  }
}
