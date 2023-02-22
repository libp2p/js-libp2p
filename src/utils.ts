import { randomBytes } from '@libp2p/crypto'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { sha256 } from 'multiformats/hashes/sha2'
import type { Message, PubSubRPCMessage } from '@libp2p/interface-pubsub'
import { peerIdFromBytes, peerIdFromKeys } from '@libp2p/peer-id'
import { codes } from './errors.js'
import { CodeError } from '@libp2p/interfaces/errors'

/**
 * Generate a random sequence number
 */
export function randomSeqno (): bigint {
  return BigInt(`0x${uint8ArrayToString(randomBytes(8), 'base16')}`)
}

/**
 * Generate a message id, based on the `key` and `seqno`
 */
export const msgId = (key: Uint8Array, seqno: bigint): Uint8Array => {
  const seqnoBytes = uint8ArrayFromString(seqno.toString(16).padStart(16, '0'), 'base16')

  const msgId = new Uint8Array(key.length + seqnoBytes.length)
  msgId.set(key, 0)
  msgId.set(seqnoBytes, key.length)

  return msgId
}

/**
 * Generate a message id, based on message `data`
 */
export const noSignMsgId = (data: Uint8Array): Uint8Array | Promise<Uint8Array> => {
  return sha256.encode(data)
}

/**
 * Check if any member of the first set is also a member
 * of the second set
 */
export const anyMatch = (a: Set<number> | number[], b: Set<number> | number[]): boolean => {
  let bHas
  if (Array.isArray(b)) {
    bHas = (val: number) => b.includes(val)
  } else {
    bHas = (val: number) => b.has(val)
  }

  for (const val of a) {
    if (bHas(val)) {
      return true
    }
  }

  return false
}

/**
 * Make everything an array
 */
export const ensureArray = function <T> (maybeArray: T | T[]): T[] {
  if (!Array.isArray(maybeArray)) {
    return [maybeArray]
  }

  return maybeArray
}

const isSigned = async (message: PubSubRPCMessage): Promise<boolean> => {
  if ((message.sequenceNumber == null) || (message.from == null) || (message.signature == null)) {
    return false
  }
  // if a public key is present in the `from` field, the message should be signed
  const fromID = peerIdFromBytes(message.from)
  if (fromID.publicKey != null) {
    return true
  }

  if (message.key != null) {
    const signingID = await peerIdFromKeys(message.key)
    return signingID.equals(fromID)
  }

  return false
}

export const toMessage = async (message: PubSubRPCMessage): Promise<Message> => {
  if (message.from == null) {
    throw new CodeError('RPC message was missing from', codes.ERR_MISSING_FROM)
  }

  if (!await isSigned(message)) {
    return {
      type: 'unsigned',
      topic: message.topic ?? '',
      data: message.data ?? new Uint8Array(0)
    }
  }

  const from = peerIdFromBytes(message.from)

  const msg: Message = {
    type: 'signed',
    from: peerIdFromBytes(message.from),
    topic: message.topic ?? '',
    sequenceNumber: bigIntFromBytes(message.sequenceNumber ?? new Uint8Array(0)),
    data: message.data ?? new Uint8Array(0),
    signature: message.signature ?? new Uint8Array(0),
    key: message.key ?? from.publicKey ?? new Uint8Array(0)
  }

  if (msg.key.length === 0) {
    throw new CodeError('Signed RPC message was missing key', codes.ERR_MISSING_KEY)
  }

  return msg
}

export const toRpcMessage = (message: Message): PubSubRPCMessage => {
  if (message.type === 'signed') {
    return {
      from: message.from.multihash.bytes,
      data: message.data,
      sequenceNumber: bigIntToBytes(message.sequenceNumber),
      topic: message.topic,
      signature: message.signature,
      key: message.key
    }
  }

  return {
    data: message.data,
    topic: message.topic
  }
}

export const bigIntToBytes = (num: bigint): Uint8Array => {
  let str = num.toString(16)

  if (str.length % 2 !== 0) {
    str = `0${str}`
  }

  return uint8ArrayFromString(str, 'base16')
}

export const bigIntFromBytes = (num: Uint8Array): bigint => {
  return BigInt(`0x${uint8ArrayToString(num, 'base16')}`)
}
