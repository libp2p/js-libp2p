'use strict'

const crypto = require('crypto')
const setImmediate = require('async/setImmediate')

const curves = {
  'P-256': 'prime256v1',
  'P-384': 'secp384r1',
  'P-521': 'secp521r1'
}

exports.generateEphmeralKeyPair = function (curve, callback) {
  if (!curves[curve]) {
    return callback(new Error(`Unkown curve: ${curve}`))
  }
  const ecdh = crypto.createECDH(curves[curve])
  ecdh.generateKeys()

  setImmediate(() => callback(null, {
    key: ecdh.getPublicKey(),
    genSharedKey (theirPub, forcePrivate, cb) {
      if (typeof forcePrivate === 'function') {
        cb = forcePrivate
        forcePrivate = null
      }

      if (forcePrivate) {
        ecdh.setPrivateKey(forcePrivate.private)
      }

      let secret
      try {
        secret = ecdh.computeSecret(theirPub)
      } catch (err) {
        return cb(err)
      }

      setImmediate(() => cb(null, secret))
    }
  }))
}
