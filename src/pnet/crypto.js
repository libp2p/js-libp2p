'use strict'

const { Buffer } = require('buffer')
const debug = require('debug')
const Errors = require('./errors')
const xsalsa20 = require('xsalsa20')
const KEY_LENGTH = require('./key-generator').KEY_LENGTH

const log = debug('libp2p:pnet')
log.trace = debug('libp2p:pnet:trace')
log.error = debug('libp2p:pnet:err')

/**
  * Creates a stream iterable to encrypt messages in a private network
 *
 * @param {Buffer} nonce The nonce to use in encryption
 * @param {Buffer} psk The private shared key to use in encryption
 * @returns {*} a through iterable
 */
module.exports.createBoxStream = (nonce, psk) => {
  const xor = xsalsa20(nonce, psk)
  return (source) => (async function * () {
    for await (const chunk of source) {
      yield Buffer.from(xor.update(chunk.slice()))
    }
  })()
}

/**
  * Creates a stream iterable to decrypt messages in a private network
 *
 * @param {Buffer} nonce The nonce of the remote peer
 * @param {Buffer} psk The private shared key to use in decryption
 * @returns {*} a through iterable
 */
module.exports.createUnboxStream = (nonce, psk) => {
  return (source) => (async function * () {
    const xor = xsalsa20(nonce, psk)
    log.trace('Decryption enabled')

    for await (const chunk of source) {
      yield Buffer.from(xor.update(chunk.slice()))
    }
  })()
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
    // programmatically instead of making assumptions about the
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
    log.error(err)
    throw new Error(Errors.INVALID_PSK)
  }
}
