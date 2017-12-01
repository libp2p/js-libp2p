'use strict'

const nacl = require('tweetnacl')
const setImmediate = require('async/setImmediate')

exports.publicKeyLength = nacl.sign.publicKeyLength
exports.privateKeyLength = nacl.sign.secretKeyLength

exports.generateKey = function (callback) {
  setImmediate(() => {
    let result
    try {
      result = nacl.sign.keyPair()
    } catch (err) {
      return callback(err)
    }
    callback(null, result)
  })
}

// seed should be a 32 byte uint8array
exports.generateKeyFromSeed = function (seed, callback) {
  setImmediate(() => {
    let result
    try {
      result = nacl.sign.keyPair.fromSeed(seed)
    } catch (err) {
      return callback(err)
    }
    callback(null, result)
  })
}

exports.hashAndSign = function (key, msg, callback) {
  setImmediate(() => {
    callback(null, Buffer.from(nacl.sign.detached(msg, key)))
  })
}

exports.hashAndVerify = function (key, sig, msg, callback) {
  setImmediate(() => {
    let result
    try {
      result = nacl.sign.detached.verify(msg, sig, key)
    } catch (err) {
      return callback(err)
    }

    callback(null, result)
  })
}
