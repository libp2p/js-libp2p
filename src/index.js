'use strict'

const keyGenerators = require('./keys')

exports.utils = require('./utils')

// Generates a keypair of the given type and bitsize
exports.generateKeyPair = (type, bits) => {
  let generator = keyGenerators[type.toLowerCase()]
  if (!generator) {
    throw new Error('invalid or unsupported key type')
  }

  return generator(bits)
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
