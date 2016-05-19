'use strict'

exports.utils = require('./utils')
const keys = exports.keys = require('./keys')

// Generates a keypair of the given type and bitsize
exports.generateKeyPair = (type, bits, cb) => {
  let key = keys[type.toLowerCase()]
  if (!key) {
    throw new Error('invalid or unsupported key type')
  }

  key.generateKeyPair(bits, cb)
}

// Generates an ephemeral public key and returns a function that will compute
// the shared secret key.
//
// Focuses only on ECDH now, but can be made more general in the future.
exports.generateEphemeralKeyPair = (curveName, cb) => {
  throw new Error('Not implemented')
}

// Generates a set of keys for each party by stretching the shared key.
// (myIV, theirIV, myCipherKey, theirCipherKey, myMACKey, theirMACKey)
exports.keyStretcher = (cipherType, hashType, secret) => {
  throw new Error('Not implemented')
}
