'use strict'

const { Buffer } = require('buffer')
var isTypedArray = require('is-typedarray').strict
const secp256k1 = require('secp256k1')
const sha = require('multihashing-async/src/sha')
const HASH_ALGORITHM = 'sha2-256'

function typedArrayTobuffer (arr) {
  if (isTypedArray(arr)) {
    // To avoid a copy, use the typed array's underlying ArrayBuffer to back new Buffer
    var buf = Buffer.from(arr.buffer)
    if (arr.byteLength !== arr.buffer.byteLength) {
      // Respect the "view", i.e. byteOffset and byteLength, without doing a copy
      buf = buf.slice(arr.byteOffset, arr.byteOffset + arr.byteLength)
    }
    return buf
  } else {
    // Pass through all other types to `Buffer.from`
    return Buffer.from(arr)
  }
}

module.exports = (randomBytes) => {
  const privateKeyLength = 32

  function generateKey () {
    let privateKey
    do {
      privateKey = randomBytes(32)
    } while (!secp256k1.privateKeyVerify(privateKey))
    return privateKey
  }

  async function hashAndSign (key, msg) {
    const digest = await sha.digest(msg, HASH_ALGORITHM)
    const sig = secp256k1.ecdsaSign(digest, key)
    return typedArrayTobuffer(secp256k1.signatureExport(sig.signature))
  }

  async function hashAndVerify (key, sig, msg) {
    const digest = await sha.digest(msg, HASH_ALGORITHM)
    sig = typedArrayTobuffer(secp256k1.signatureImport(sig))
    return secp256k1.ecdsaVerify(sig, digest, key)
  }

  function compressPublicKey (key) {
    if (!secp256k1.publicKeyVerify(key)) {
      throw new Error('Invalid public key')
    }
    return typedArrayTobuffer(secp256k1.publicKeyConvert(key, true))
  }

  function decompressPublicKey (key) {
    return typedArrayTobuffer(secp256k1.publicKeyConvert(key, false))
  }

  function validatePrivateKey (key) {
    if (!secp256k1.privateKeyVerify(key)) {
      throw new Error('Invalid private key')
    }
  }

  function validatePublicKey (key) {
    if (!secp256k1.publicKeyVerify(key)) {
      throw new Error('Invalid public key')
    }
  }

  function computePublicKey (privateKey) {
    validatePrivateKey(privateKey)
    return typedArrayTobuffer(secp256k1.publicKeyCreate(privateKey))
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
