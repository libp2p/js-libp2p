'use strict'

const secp256k1 = require('secp256k1')
const multihashing = require('multihashing-async')
const setImmediate = require('async/setImmediate')
const randomBytes = require('libp2p-crypto').randomBytes

const HASH_ALGORITHM = 'sha2-256'

exports.privateKeyLength = 32

exports.generateKey = function (callback) {
  const done = (err, res) => setImmediate(() => {
    callback(err, res)
  })

  let privateKey
  do {
    privateKey = randomBytes(32)
  } while (!secp256k1.privateKeyVerify(privateKey))

  done(null, privateKey)
}

exports.hashAndSign = function (key, msg, callback) {
  const done = (err, res) => setImmediate(() => {
    callback(err, res)
  })

  multihashing.digest(msg, HASH_ALGORITHM, (err, digest) => {
    if (err) return done(err)
    try {
      const sig = secp256k1.sign(digest, key)
      const sigDER = secp256k1.signatureExport(sig.signature)
      return done(null, sigDER)
    } catch (err) {
      done(err)
    }
  })
}

exports.hashAndVerify = function (key, sig, msg, callback) {
  const done = (err, res) => setImmediate(() => {
    callback(err, res)
  })

  multihashing.digest(msg, HASH_ALGORITHM, (err, digest) => {
    if (err) return done(err)
    try {
      sig = secp256k1.signatureImport(sig)
      const valid = secp256k1.verify(digest, sig, key)
      return done(null, valid)
    } catch (err) {
      done(err)
    }
  })
}

exports.compressPublicKey = function compressPublicKey (key) {
  if (!secp256k1.publicKeyVerify(key)) {
    throw new Error('Invalid public key')
  }
  return secp256k1.publicKeyConvert(key, true)
}

exports.decompressPublicKey = function decompressPublicKey (key) {
  return secp256k1.publicKeyConvert(key, false)
}

exports.validatePrivateKey = function validatePrivateKey (key) {
  if (!secp256k1.privateKeyVerify(key)) {
    throw new Error('Invalid private key')
  }
}

exports.validatePublicKey = function validatePublicKey (key) {
  if (!secp256k1.publicKeyVerify(key)) {
    throw new Error('Invalid public key')
  }
}

exports.computePublicKey = function computePublicKey (privateKey) {
  exports.validatePrivateKey(privateKey)
  return secp256k1.publicKeyCreate(privateKey)
}
