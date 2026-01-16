import { publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { sha256 } from 'multiformats/hashes/sha2'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { Message } from '../index.js'
import type { PublicKey } from '@libp2p/interface'

/**
 * Generate a message id, based on the `key` and `seqno`
 */
export const msgId = (key: PublicKey, seqno: bigint): Uint8Array => {
  const seqnoBytes = uint8ArrayFromString(seqno.toString(16).padStart(16, '0'), 'base16')
  const keyBytes = publicKeyToProtobuf(key)

  const msgId = new Uint8Array(keyBytes.byteLength + seqnoBytes.length)
  msgId.set(keyBytes, 0)
  msgId.set(seqnoBytes, keyBytes.byteLength)

  return msgId
}

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
