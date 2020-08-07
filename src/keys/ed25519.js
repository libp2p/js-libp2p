'use strict'

require('node-forge/lib/ed25519')
const forge = require('node-forge/lib/forge')
exports.publicKeyLength = forge.pki.ed25519.constants.PUBLIC_KEY_BYTE_LENGTH
exports.privateKeyLength = forge.pki.ed25519.constants.PRIVATE_KEY_BYTE_LENGTH

exports.generateKey = async function () { // eslint-disable-line require-await
  return forge.pki.ed25519.generateKeyPair()
}

// seed should be a 32 byte uint8array
exports.generateKeyFromSeed = async function (seed) { // eslint-disable-line require-await
  return forge.pki.ed25519.generateKeyPair({ seed })
}

exports.hashAndSign = async function (key, msg) { // eslint-disable-line require-await
  return forge.pki.ed25519.sign({ message: msg, privateKey: key })
  // return Uint8Array.from(nacl.sign.detached(msg, key))
}

exports.hashAndVerify = async function (key, sig, msg) { // eslint-disable-line require-await
  return forge.pki.ed25519.verify({ signature: sig, message: msg, publicKey: key })
}
