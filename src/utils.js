'use strict'

const crypto = require('libp2p-crypto')
const bs58 = require('bs58')

exports = module.exports

/**
 * Generatea random sequence number.
 *
 * @returns {Buffer}
 * @private
 */
exports.randomSeqno = () => {
  return crypto.randomBytes(20)
}

/**
 * Generate a message id, based on the `from` and `seqno`.
 *
 * @param {string} from
 * @param {Buffer} seqno
 * @returns {string}
 * @private
 */
exports.msgId = (from, seqno) => {
  return from + seqno.toString('hex')
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

  for (let val of a) {
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
 * @param {Buffer|String} message.from
 * @return {Object}
 */
exports.normalizeInRpcMessage = (message) => {
  const m = Object.assign({}, message)
  if (Buffer.isBuffer(message.from)) {
    m.from = bs58.encode(message.from)
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
    m.from = bs58.decode(message.from)
  }
  return m
}

exports.normalizeOutRpcMessages = (messages) => {
  if (!messages) {
    return messages
  }
  return messages.map(exports.normalizeOutRpcMessage)
}
