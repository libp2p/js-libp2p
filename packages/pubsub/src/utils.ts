import { randomBytes } from '@libp2p/crypto'
import { publicKeyFromProtobuf, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { InvalidMessageError } from '@libp2p/interface'
import { peerIdFromMultihash, peerIdFromPublicKey } from '@libp2p/peer-id'
import * as Digest from 'multiformats/hashes/digest'
import { sha256 } from 'multiformats/hashes/sha2'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Message, PubSubRPCMessage, PublicKey } from '@libp2p/interface'

/**
 * Generate a random sequence number
 */
export function randomSeqno (): bigint {
  return BigInt(`0x${uint8ArrayToString(randomBytes(8), 'base16')}`)
}

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
  const fromID = peerIdFromMultihash(Digest.decode(message.from))
  if (fromID.publicKey != null) {
    return true
  }

  if (message.key != null) {
    const signingKey = message.key
    const signingID = peerIdFromPublicKey(publicKeyFromProtobuf(signingKey))

    return signingID.equals(fromID)
  }

  return false
}

export const toMessage = async (message: PubSubRPCMessage): Promise<Message> => {
  if (message.from == null) {
    throw new InvalidMessageError('RPC message was missing from')
  }

  if (!await isSigned(message)) {
    return {
      type: 'unsigned',
      topic: message.topic ?? '',
      data: message.data ?? new Uint8Array(0)
    }
  }

  const from = peerIdFromMultihash(Digest.decode(message.from))
  const key = message.key ?? from.publicKey

  if (key == null) {
    throw new InvalidMessageError('RPC message was missing public key')
  }

  const msg: Message = {
    type: 'signed',
    from,
    topic: message.topic ?? '',
    sequenceNumber: bigIntFromBytes(message.sequenceNumber ?? new Uint8Array(0)),
    data: message.data ?? new Uint8Array(0),
    signature: message.signature ?? new Uint8Array(0),
    key: key instanceof Uint8Array ? publicKeyFromProtobuf(key) : key
  }

  return msg
}

export const toRpcMessage = (message: Message): PubSubRPCMessage => {
  if (message.type === 'signed') {
    return {
      from: message.from.toMultihash().bytes,
      data: message.data,
      sequenceNumber: bigIntToBytes(message.sequenceNumber),
      topic: message.topic,
      signature: message.signature,

      key: message.key ? publicKeyToProtobuf(message.key) : undefined
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
