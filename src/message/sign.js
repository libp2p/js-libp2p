'use strict'

const PeerId = require('peer-id')
const { Message } = require('./index')
const uint8ArrayConcat = require('uint8arrays/concat')
const uint8ArrayFromString = require('uint8arrays/from-string')
const SignPrefix = uint8ArrayFromString('libp2p-pubsub:')

/**
 * Signs the provided message with the given `peerId`
 *
 * @param {PeerId} peerId
 * @param {Message} message
 * @returns {Promise<Message>}
 */
async function signMessage (peerId, message) {
  // Get the message in bytes, and prepend with the pubsub prefix
  const bytes = uint8ArrayConcat([
    SignPrefix,
    Message.encode(message)
  ])

  const signature = await peerId.privKey.sign(bytes)

  return {
    ...message,
    signature: signature,
    key: peerId.pubKey.bytes
  }
}

/**
 * Verifies the signature of the given message
 * @param {rpc.RPC.Message} message
 * @returns {Promise<Boolean>}
 */
async function verifySignature (message) {
  // Get message sans the signature
  const baseMessage = { ...message }
  delete baseMessage.signature
  delete baseMessage.key
  const bytes = uint8ArrayConcat([
    SignPrefix,
    Message.encode(baseMessage)
  ])

  // Get the public key
  const pubKey = await messagePublicKey(message)

  // verify the base message
  return pubKey.verify(bytes, message.signature)
}

/**
 * Returns the PublicKey associated with the given message.
 * If no, valid PublicKey can be retrieved an error will be returned.
 *
 * @param {Message} message
 * @returns {Promise<PublicKey>}
 */
async function messagePublicKey (message) {
  if (message.key) {
    const peerId = await PeerId.createFromPubKey(message.key)

    // the key belongs to the sender, return the key
    if (peerId.isEqual(message.from)) return peerId.pubKey
    // We couldn't validate pubkey is from the originator, error
    throw new Error('Public Key does not match the originator')
  } else {
    // should be available in the from property of the message (peer id)
    const from = PeerId.createFromBytes(message.from)

    if (from.pubKey) {
      return from.pubKey
    } else {
      throw new Error('Could not get the public key from the originator id')
    }
  }
}

module.exports = {
  messagePublicKey,
  signMessage,
  SignPrefix,
  verifySignature
}
