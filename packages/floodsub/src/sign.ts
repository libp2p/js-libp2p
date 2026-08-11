import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toRpcMessage } from './utils.ts'
import type { PubSubRPCMessage } from './floodsub.ts'
import type { SignedMessage } from './index.ts'
import type { PeerId, PrivateKey, PublicKey } from '@libp2p/interface'

export const SignPrefix = uint8ArrayFromString('libp2p-pubsub:')

/**
 * Signs the provided message with the given `peerId`
 */
export async function signMessage (privateKey: PrivateKey, message: { from: PeerId, topic: string, data: Uint8Array, sequenceNumber: bigint }, encode: (rpc: PubSubRPCMessage) => Uint8Array): Promise<SignedMessage> {
  // @ts-expect-error signature field is missing, added below
  const outputMessage: SignedMessage = {
    type: 'signed',
    topic: message.topic,
    data: message.data,
    sequenceNumber: message.sequenceNumber,
    from: peerIdFromPrivateKey(privateKey)
  }

  // Get the message in bytes, and prepend with the pubsub prefix
  const bytes = uint8ArrayConcat([
    SignPrefix,
    encode(toRpcMessage(outputMessage)).subarray()
  ])

  outputMessage.signature = await privateKey.sign(bytes)
  outputMessage.key = privateKey.publicKey

  return outputMessage
}

/**
 * Verifies the signature of the given message
 */
export async function verifySignature (message: SignedMessage, encode: (rpc: PubSubRPCMessage) => Uint8Array): Promise<boolean> {
  if (message.type !== 'signed') {
    throw new Error('Message type must be "signed" to be verified')
  }

  if (message.signature == null) {
    throw new Error('Message must contain a signature to be verified')
  }

  if (message.from == null) {
    throw new Error('Message must contain a from property to be verified')
  }

  // Get message sans the signature
  const bytes = uint8ArrayConcat([
    SignPrefix,
    encode({
      ...toRpcMessage(message),
      signature: undefined,
      key: undefined
    }).subarray()
  ])

  // Get the public key
  const pubKey = messagePublicKey(message)

  // verify the base message
  return pubKey.verify(bytes, message.signature)
}

/**
 * Returns the PublicKey associated with the given message.
 * If no valid PublicKey can be retrieved an error will be returned.
 */
export function messagePublicKey (message: SignedMessage): PublicKey {
  if (message.type !== 'signed') {
    throw new Error('Message type must be "signed" to have a public key')
  }

  // should be available in the from property of the message (peer id)
  if (message.from == null) {
    throw new Error('Could not get the public key from the originator id')
  }

  // an Ed25519/secp256k1 peer id embeds its own public key, so a key recovered
  // from `from` is provably the author's; trust it over the supplied message.key
  if (message.from.publicKey != null) {
    return message.from.publicKey
  }

  // otherwise the supplied key must derive to the from peer id, else a message
  // could be signed by one key while claiming a different author
  if (message.key != null && message.from.equals(message.key.toMultihash().bytes)) {
    return message.key
  }

  // We couldn't validate pubkey is from the originator, error
  throw new Error('Could not get the public key from the originator id')
}
