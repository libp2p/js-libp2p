'use strict'

const PeerId = require('peer-id')
const { Message } = require('./index')
const SignPrefix = Buffer.from('libp2p-pubsub:')

/**
 * Signs the provided message with the given `peerId`
 *
 * @param {PeerId} peerId
 * @param {Message} message
 * @param {function(Error, Message)} callback
 * @returns {void}
 */
function signMessage (peerId, message, callback) {
  // Get the message in bytes, and prepend with the pubsub prefix
  const bytes = Buffer.concat([
    SignPrefix,
    Message.encode(message)
  ])

  // Sign the bytes with the private key
  peerId.privKey.sign(bytes, (err, signature) => {
    if (err) return callback(err)

    callback(null, {
      ...message,
      signature: signature,
      key: peerId.pubKey.bytes
    })
  })
}

/**
 * Verifies the signature of the given message
 * @param {rpc.RPC.Message} message
 * @param {function(Error, Boolean)} callback
 */
function verifySignature (message, callback) {
  // Get message sans the signature
  let baseMessage = { ...message }
  delete baseMessage.signature
  delete baseMessage.key
  const bytes = Buffer.concat([
    SignPrefix,
    Message.encode(baseMessage)
  ])

  // Get the public key
  messagePublicKey(message, (err, pubKey) => {
    if (err) return callback(err, false)
    // Verify the base message
    pubKey.verify(bytes, message.signature, callback)
  })
}

/**
 * Returns the PublicKey associated with the given message.
 * If no, valid PublicKey can be retrieved an error will be returned.
 *
 * @param {Message} message
 * @param {function(Error, PublicKey)} callback
 * @returns {void}
 */
function messagePublicKey (message, callback) {
  if (message.key) {
    PeerId.createFromPubKey(message.key, (err, peerId) => {
      if (err) return callback(err, null)
      // the key belongs to the sender, return the key
      if (peerId.isEqual(message.from)) return callback(null, peerId.pubKey)
      // We couldn't validate pubkey is from the originator, error
      callback(new Error('Public Key does not match the originator'))
    })
    return
  } else {
    // should be available in the from property of the message (peer id)
    const from = PeerId.createFromBytes(message.from)
    if (from.pubKey) {
      return callback(null, from.pubKey)
    }
  }

  callback(new Error('Could not get the public key from the originator id'))
}

module.exports = {
  messagePublicKey,
  signMessage,
  SignPrefix,
  verifySignature
}
