'use strict'

const crypto = require('libp2p-crypto')
const multibase = require('multibase')
const uint8ArrayToString = require('uint8arrays/to-string')
const uint8ArrayFromString = require('uint8arrays/from-string')

exports = module.exports

/**
 * Generatea random sequence number.
 *
 * @returns {Uint8Array}
 * @private
 */
exports.randomSeqno = () => {
  return crypto.randomBytes(8)
}

/**
 * Generate a message id, based on the `from` and `seqno`.
 *
 * @param {string} from
 * @param {Uint8Array} seqno
 * @returns {string}
 * @private
 */
exports.msgId = (from, seqno) => {
  return from + uint8ArrayToString(seqno, 'base16')
}

/**
 * Check if any member of the first set is also a member
 * of the second set.
 *
 * @param {Set|Array} a
 * @param {Set|Array} b
 * @returns {boolean}
 * @private
 */
exports.anyMatch = (a, b) => {
  let bHas
  if (Array.isArray(b)) {
    bHas = (val) => b.indexOf(val) > -1
  } else {
    bHas = (val) => b.has(val)
  }

  for (const val of a) {
    if (bHas(val)) {
      return true
    }
  }

  return false
}

/**
 * Make everything an array.
 *
 * @param {any} maybeArray
 * @returns {Array}
 * @private
 */
exports.ensureArray = (maybeArray) => {
  if (!Array.isArray(maybeArray)) {
    return [maybeArray]
  }

  return maybeArray
}

/**
 * Ensures `message.from` is base58 encoded
 * @param {Object} message
 * @param {Uint8Array|String} message.from
 * @return {Object}
 */
exports.normalizeInRpcMessage = (message) => {
  const m = Object.assign({}, message)
  if (message.from instanceof Uint8Array) {
    m.from = uint8ArrayToString(message.from, 'base58btc')
  }
  return m
}

/**
 * The same as `normalizeInRpcMessage`, but performed on an array of messages
 * @param {Object[]} messages
 * @return {Object[]}
 */
exports.normalizeInRpcMessages = (messages) => {
  if (!messages) {
    return messages
  }
  return messages.map(exports.normalizeInRpcMessage)
}

exports.normalizeOutRpcMessage = (message) => {
  const m = Object.assign({}, message)
  if (typeof message.from === 'string' || message.from instanceof String) {
    m.from = multibase.decode('z' + message.from)
  }
  if (typeof message.data === 'string' || message.data instanceof String) {
    m.data = uint8ArrayFromString(message.data)
  }
  return m
}

exports.normalizeOutRpcMessages = (messages) => {
  if (!messages) {
    return messages
  }
  return messages.map(exports.normalizeOutRpcMessage)
}
