'use strict'

const debug = require('debug')
const log = Object.assign(debug('libp2p:pnet'), {
  trace: debug('libp2p:pnet:trace'),
  error: debug('libp2p:pnet:err')
})

const Errors = require('./errors')
// @ts-ignore xsalsa20 has no types exported
const xsalsa20 = require('xsalsa20')
const KEY_LENGTH = require('./key-generator').KEY_LENGTH
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

/**
 * Creates a stream iterable to encrypt messages in a private network
 *
 * @param {Uint8Array} nonce - The nonce to use in encryption
 * @param {Uint8Array} psk - The private shared key to use in encryption
 * @returns {*} a through iterable
 */
module.exports.createBoxStream = (nonce, psk) => {
  const xor = xsalsa20(nonce, psk)

  return (/** @type {AsyncIterable<Uint8Array>} */ source) => (async function * () {
    for await (const chunk of source) {
      yield Uint8Array.from(xor.update(chunk.slice()))
    }
  })()
}

/**
 * Creates a stream iterable to decrypt messages in a private network
 *
 * @param {Uint8Array} nonce - The nonce of the remote peer
 * @param {Uint8Array} psk - The private shared key to use in decryption
 * @returns {*} a through iterable
 */
module.exports.createUnboxStream = (nonce, psk) => {
  return (/** @type {AsyncIterable<Uint8Array>} */ source) => (async function * () {
    const xor = xsalsa20(nonce, psk)
    log.trace('Decryption enabled')

    for await (const chunk of source) {
      yield Uint8Array.from(xor.update(chunk.slice()))
    }
  })()
}

/**
 * Decode the version 1 psk from the given Uint8Array
 *
 * @param {Uint8Array} pskBuffer
 * @throws {INVALID_PSK}
 * @returns {{ tag?: string, codecName?: string, psk: Uint8Array }} The PSK metadata (tag, codecName, psk)
 */
module.exports.decodeV1PSK = (pskBuffer) => {
  try {
    // This should pull from multibase/multicodec to allow for
    // more encoding flexibility. Ideally we'd consume the codecs
    // from the buffer line by line to evaluate the next line
    // programmatically instead of making assumptions about the
    // encodings of each line.
    const metadata = uint8ArrayToString(pskBuffer).split(/(?:\r\n|\r|\n)/g)
    const pskTag = metadata.shift()
    const codec = metadata.shift()
    const pskString = metadata.shift()
    const psk = pskString && uint8ArrayFromString(pskString, 'base16')

    if (!psk || psk.byteLength !== KEY_LENGTH) {
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
