'use strict'

const nacl = require('tweetnacl')
const setImmediate = require('async/setImmediate')
const Buffer = require('safe-buffer').Buffer

exports.publicKeyLength = nacl.sign.publicKeyLength
exports.privateKeyLength = nacl.sign.secretKeyLength

exports.generateKey = function (callback) {
  const done = (err, res) => setImmediate(() => {
    callback(err, res)
  })

  let keys
  try {
    keys = nacl.sign.keyPair()
  } catch (err) {
    return done(err)
  }
  done(null, keys)
}

// seed should be a 32 byte uint8array
exports.generateKeyFromSeed = function (seed, callback) {
  const done = (err, res) => setImmediate(() => callback(err, res))

  let keys
  try {
    keys = nacl.sign.keyPair.fromSeed(seed)
  } catch (err) {
    return done(err)
  }
  done(null, keys)
}

exports.hashAndSign = function (key, msg, callback) {
  setImmediate(() => {
    callback(null, Buffer.from(nacl.sign.detached(msg, key)))
  })
}

exports.hashAndVerify = function (key, sig, msg, callback) {
  setImmediate(() => {
    callback(null, nacl.sign.detached.verify(msg, sig, key))
  })
}
