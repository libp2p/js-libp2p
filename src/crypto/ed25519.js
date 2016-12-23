'use strict'

const nacl = require('tweetnacl')
const setImmediate = require('async/setImmediate')

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
    done(err)
    return
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
