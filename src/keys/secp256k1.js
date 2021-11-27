'use strict'

const errcode = require('err-code')
const secp = require('@noble/secp256k1')
const { sha256 } = require('multiformats/hashes/sha2')

module.exports = () => {
  const privateKeyLength = 32

  function generateKey () {
    return secp.utils.randomPrivateKey()
  }

  /**
   * Hash and sign message with private key
   *
   * @param {number | bigint | (string | Uint8Array)} key
   * @param {Uint8Array} msg
   */
  async function hashAndSign (key, msg) {
    const { digest } = await sha256.digest(msg)
    try {
      return await secp.sign(digest, key)
    } catch (err) {
      throw errcode(err, 'ERR_INVALID_INPUT')
    }
  }

  /**
   * Hash message and verify signature with public key
   *
   * @param {secp.Point | (string | Uint8Array)} key
   * @param {(string | Uint8Array) | secp.Signature} sig
   * @param {Uint8Array} msg
   */
  async function hashAndVerify (key, sig, msg) {
    try {
      const { digest } = await sha256.digest(msg)
      return secp.verify(sig, digest, key)
    } catch (err) {
      throw errcode(err, 'ERR_INVALID_INPUT')
    }
  }

  function compressPublicKey (key) {
    const point = secp.Point.fromHex(key).toRawBytes(true)
    return point
  }

  function decompressPublicKey (key) {
    const point = secp.Point.fromHex(key).toRawBytes(false)
    return point
  }

  function validatePrivateKey (key) {
    try {
      secp.getPublicKey(key, true)
    } catch (err) {
      throw errcode(err, 'ERR_INVALID_PRIVATE_KEY')
    }
  }

  function validatePublicKey (key) {
    try {
      secp.Point.fromHex(key)
    } catch (err) {
      throw errcode(err, 'ERR_INVALID_PUBLIC_KEY')
    }
  }

  function computePublicKey (privateKey) {
    try {
      return secp.getPublicKey(privateKey, true)
    } catch (err) {
      throw errcode(err, 'ERR_INVALID_PRIVATE_KEY')
    }
  }

  return {
    generateKey,
    privateKeyLength,
    hashAndSign,
    hashAndVerify,
    compressPublicKey,
    decompressPublicKey,
    validatePrivateKey,
    validatePublicKey,
    computePublicKey
  }
}
