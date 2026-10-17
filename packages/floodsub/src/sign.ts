import { publicKeyForPeer } from '@libp2p/crypto'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toRpcMessage } from './utils.ts'
import type { PubSubRPCMessage } from './floodsub.ts'
import type { SignedMessage } from './index.ts'
import type { CryptoLoaderOptions } from '@libp2p/crypto'
import type { PeerId, PrivateKey, PublicKey } from '@libp2p/interface'

export const SignPrefix = uint8ArrayFromString('libp2p-pubsub:')

/**
 * Signs the provided message with the given private key
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
 * Verifies the signature of the given message, returning false if its key does
 * not belong to the author
 */
export async function verifySignature (message: SignedMessage, encode: (rpc: PubSubRPCMessage) => Uint8Array, options?: CryptoLoaderOptions): Promise<boolean> {
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

  let pubKey: PublicKey

  try {
    // only trust a supplied key if it derives to the author
    pubKey = await publicKeyForPeer(message.from, message.key?.toProtobuf(), options)
  } catch (err: any) {
    if (err.name === 'InvalidPublicKeyError') {
      return false
    }

    throw err
  }

  // verify the base message
  return pubKey.verify(bytes, message.signature)
}
