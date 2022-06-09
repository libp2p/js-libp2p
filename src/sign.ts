import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toRpcMessage } from './utils.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { keys } from '@libp2p/crypto'
import type { Message, PubSubRPCMessage } from '@libp2p/interfaces/pubsub'
import { peerIdFromKeys } from '@libp2p/peer-id'

export const SignPrefix = uint8ArrayFromString('libp2p-pubsub:')

/**
 * Signs the provided message with the given `peerId`
 */
export async function signMessage (peerId: PeerId, message: Message, encode: (rpc: PubSubRPCMessage) => Uint8Array) {
  // Get the message in bytes, and prepend with the pubsub prefix
  const bytes = uint8ArrayConcat([
    SignPrefix,
    encode(toRpcMessage(message))
  ])

  if (peerId.privateKey == null) {
    throw new Error('Cannot sign message, no private key present')
  }

  if (peerId.publicKey == null) {
    throw new Error('Cannot sign message, no public key present')
  }

  const privateKey = await keys.unmarshalPrivateKey(peerId.privateKey)
  const signature = await privateKey.sign(bytes)

  const outputMessage: Message = {
    ...message,
    signature: signature,
    key: peerId.publicKey
  }

  return outputMessage
}

/**
 * Verifies the signature of the given message
 */
export async function verifySignature (message: Message, encode: (rpc: PubSubRPCMessage) => Uint8Array) {
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
    })
  ])

  // Get the public key
  const pubKeyBytes = await messagePublicKey(message)
  const pubKey = keys.unmarshalPublicKey(pubKeyBytes)

  // verify the base message
  return await pubKey.verify(bytes, message.signature)
}

/**
 * Returns the PublicKey associated with the given message.
 * If no valid PublicKey can be retrieved an error will be returned.
 */
export async function messagePublicKey (message: Message) {
  // should be available in the from property of the message (peer id)
  if (message.from == null) {
    throw new Error('Could not get the public key from the originator id')
  }

  if (message.key != null) {
    const keyPeerId = await peerIdFromKeys(message.key)

    if (keyPeerId.publicKey != null) {
      return keyPeerId.publicKey
    }
  }

  if (message.from.publicKey != null) {
    return message.from.publicKey
  }

  // We couldn't validate pubkey is from the originator, error
  throw new Error('Could not get the public key from the originator id')
}
