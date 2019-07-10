'use strict'

const nacl = require('tweetnacl')

exports.publicKeyLength = nacl.sign.publicKeyLength
exports.privateKeyLength = nacl.sign.secretKeyLength

exports.generateKey = async function () { // eslint-disable-line require-await
  return nacl.sign.keyPair()
}

// seed should be a 32 byte uint8array
exports.generateKeyFromSeed = async function (seed) { // eslint-disable-line require-await
  return nacl.sign.keyPair.fromSeed(seed)
}

exports.hashAndSign = async function (key, msg) { // eslint-disable-line require-await
  return Buffer.from(nacl.sign.detached(msg, key))
}

exports.hashAndVerify = async function (key, sig, msg) { // eslint-disable-line require-await
  return nacl.sign.detached.verify(msg, sig, key)
}
