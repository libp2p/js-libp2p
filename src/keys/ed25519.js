'use strict'

const nacl = require('tweetnacl')
const nextTick = require('async/nextTick')

exports.publicKeyLength = nacl.sign.publicKeyLength
exports.privateKeyLength = nacl.sign.secretKeyLength

exports.generateKey = function (callback) {
  nextTick(() => {
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
  nextTick(() => {
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
  nextTick(() => {
    callback(null, Buffer.from(nacl.sign.detached(msg, key)))
  })
}

exports.hashAndVerify = function (key, sig, msg, callback) {
  nextTick(() => {
    let result
    try {
      result = nacl.sign.detached.verify(msg, sig, key)
    } catch (err) {
      return callback(err)
    }

    callback(null, result)
  })
}
