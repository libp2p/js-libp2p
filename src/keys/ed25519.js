'use strict'

const ed = require('@noble/ed25519')

const PUBLIC_KEY_BYTE_LENGTH = 32
const PRIVATE_KEY_BYTE_LENGTH = 64 // private key is actually 32 bytes but for historical reasons we concat private and public keys
const KEYS_BYTE_LENGTH = 32

exports.publicKeyLength = PUBLIC_KEY_BYTE_LENGTH
exports.privateKeyLength = PRIVATE_KEY_BYTE_LENGTH

exports.generateKey = async function () {
  // the actual private key (32 bytes)
  const privateKeyRaw = ed.utils.randomPrivateKey()
  const publicKey = await ed.getPublicKey(privateKeyRaw)

  // concatenated the public key to the private key
  const privateKey = concatKeys(privateKeyRaw, publicKey)

  return {
    privateKey,
    publicKey
  }
}

/**
 * Generate keypair from a seed
 *
 * @param {Uint8Array} seed - seed should be a 32 byte uint8array
 * @returns
 */
exports.generateKeyFromSeed = async function (seed) {
  if (seed.length !== KEYS_BYTE_LENGTH) {
    throw new TypeError('"seed" must be 32 bytes in length.')
  } else if (!(seed instanceof Uint8Array)) {
    throw new TypeError('"seed" must be a node.js Buffer, or Uint8Array.')
  }

  // based on node forges algorithm, the seed is used directly as private key
  const privateKeyRaw = seed
  const publicKey = await ed.getPublicKey(privateKeyRaw)

  const privateKey = concatKeys(privateKeyRaw, publicKey)

  return {
    privateKey,
    publicKey
  }
}

exports.hashAndSign = function (privateKey, msg) {
  const privateKeyRaw = privateKey.slice(0, KEYS_BYTE_LENGTH)

  return ed.sign(msg, privateKeyRaw)
}

exports.hashAndVerify = function (publicKey, sig, msg) {
  return ed.verify(sig, msg, publicKey)
}

function concatKeys (privateKeyRaw, publicKey) {
  const privateKey = new Uint8Array(exports.privateKeyLength)
  for (let i = 0; i < KEYS_BYTE_LENGTH; i++) {
    privateKey[i] = privateKeyRaw[i]
    privateKey[KEYS_BYTE_LENGTH + i] = publicKey[i]
  }
  return privateKey
}
