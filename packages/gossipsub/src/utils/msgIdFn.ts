import { msgId } from '@libp2p/pubsub/utils'
import { sha256 } from 'multiformats/hashes/sha2'
import type { Message } from '../index.js'

/**
 * Generate a message id, based on the `key` and `seqno`
 */
export function msgIdFnStrictSign (msg: Message): Uint8Array {
  if (msg.type !== 'signed') {
    throw new Error('expected signed message type')
  }
  // Should never happen
  if (msg.sequenceNumber == null) { throw Error('missing seqno field') }

  // TODO: Should use .from here or key?
  return msgId(msg.from.publicKey ?? msg.key, msg.sequenceNumber)
}

/**
 * Generate a message id, based on message `data`
 */
export async function msgIdFnStrictNoSign (msg: Message): Promise<Uint8Array> {
  return sha256.encode(msg.data)
}
