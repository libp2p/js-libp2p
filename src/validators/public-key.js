'use strict'

const { sha256 } = require('multiformats/hashes/sha2')
const errcode = require('err-code')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')
const { equals: uint8ArrayEquals } = require('uint8arrays/equals')

/**
 * Validator for public key records.
 * Verifies that the passed in record value is the PublicKey
 * that matches the passed in key.
 * If validation fails the returned Promise will reject with the error.
 *
 * @param {Uint8Array} key - A valid key is of the form `'/pk/<keymultihash>'`
 * @param {Uint8Array} publicKey - The public key to validate against (protobuf encoded).
 */
const validatePublicKeyRecord = async (key, publicKey) => {
  if (!(key instanceof Uint8Array)) {
    throw errcode(new Error('"key" must be a Uint8Array'), 'ERR_INVALID_RECORD_KEY_NOT_BUFFER')
  }

  if (key.byteLength < 5) {
    throw errcode(new Error('invalid public key record'), 'ERR_INVALID_RECORD_KEY_TOO_SHORT')
  }

  const prefix = uint8ArrayToString(key.subarray(0, 4))

  if (prefix !== '/pk/') {
    throw errcode(new Error('key was not prefixed with /pk/'), 'ERR_INVALID_RECORD_KEY_BAD_PREFIX')
  }

  const keyhash = key.slice(4)

  const publicKeyHash = await sha256.digest(publicKey)

  if (!uint8ArrayEquals(keyhash, publicKeyHash.bytes)) {
    throw errcode(new Error('public key does not match passed in key'), 'ERR_INVALID_RECORD_HASH_MISMATCH')
  }
}

module.exports = {
  func: validatePublicKeyRecord,
  sign: false
}
