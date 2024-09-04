import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toRpcMessage } from './utils.js'
import type { PeerId, PrivateKey, PubSubRPCMessage, PublicKey, SignedMessage } from '@libp2p/interface'

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

  if (message.key != null) {
    return message.key
  }

  if (message.from.publicKey != null) {
    return message.from.publicKey
  }

  // We couldn't validate pubkey is from the originator, error
  throw new Error('Could not get the public key from the originator id')
}
