'use strict'

const pull = require('pull-stream')
const debug = require('debug')
const Errors = require('./errors')
const xsalsa20 = require('xsalsa20')
const KEY_LENGTH = require('./key-generator').KEY_LENGTH

const log = debug('libp2p:pnet')
log.trace = debug('libp2p:pnet:trace')
log.err = debug('libp2p:pnet:err')

/**
 * Creates a pull stream to encrypt messages in a private network
 *
 * @param {Buffer} nonce The nonce to use in encryption
 * @param {Buffer} psk The private shared key to use in encryption
 * @returns {PullStream} a through stream
 */
module.exports.createBoxStream = (nonce, psk) => {
  const xor = xsalsa20(nonce, psk)
  return pull(
    ensureBuffer(),
    pull.map((chunk) => {
      return xor.update(chunk, chunk)
    })
  )
}

/**
 * Creates a pull stream to decrypt messages in a private network
 *
 * @param {Object} remote Holds the nonce of the peer
 * @param {Buffer} psk The private shared key to use in decryption
 * @returns {PullStream} a through stream
 */
module.exports.createUnboxStream = (remote, psk) => {
  let xor
  return pull(
    ensureBuffer(),
    pull.map((chunk) => {
      if (!xor) {
        xor = xsalsa20(remote.nonce, psk)
        log.trace('Decryption enabled')
      }

      return xor.update(chunk, chunk)
    })
  )
}

/**
 * Decode the version 1 psk from the given Buffer
 *
 * @param {Buffer} pskBuffer
 * @throws {INVALID_PSK}
 * @returns {Object} The PSK metadata (tag, codecName, psk)
 */
module.exports.decodeV1PSK = (pskBuffer) => {
  try {
    // This should pull from multibase/multicodec to allow for
    // more encoding flexibility. Ideally we'd consume the codecs
    // from the buffer line by line to evaluate the next line
    // programatically instead of making assumptions about the
    // encodings of each line.
    const metadata = pskBuffer.toString().split(/(?:\r\n|\r|\n)/g)
    const pskTag = metadata.shift()
    const codec = metadata.shift()
    const psk = Buffer.from(metadata.shift(), 'hex')

    if (psk.byteLength !== KEY_LENGTH) {
      throw new Error(Errors.INVALID_PSK)
    }

    return {
      tag: pskTag,
      codecName: codec,
      psk: psk
    }
  } catch (err) {
    throw new Error(Errors.INVALID_PSK)
  }
}

/**
 * Returns a through pull-stream that ensures the passed chunks
 * are buffers instead of strings
 * @returns {PullStream} a through stream
 */
function ensureBuffer () {
  return pull.map((chunk) => {
    if (typeof chunk === 'string') {
      return Buffer.from(chunk, 'utf-8')
    }

    return chunk
  })
}
