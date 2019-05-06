'use strict'

const { Message } = require('./index')
const SignPrefix = Buffer.from('libp2p-pubsub:')

module.exports.SignPrefix = SignPrefix

/**
 * Signs the provided message with the given `peerId`
 *
 * @param {PeerId} peerId
 * @param {Message} message
 * @param {function(Error, Message)} callback
 * @returns {void}
 */
module.exports.signMessage = function (peerId, message, callback) {
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
