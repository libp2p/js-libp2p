'use strict'

// Node.js land
// First we look if node-webrypto-ossl is available
// otherwise we fall back to using keypair + node core

let webcrypto
try {
  webcrypto = require('node-webcrypto-ossl')
} catch (err) {
  // not available, use the code below
}

if (webcrypto && !process.env.NO_WEBCRYPTO) {
  module.exports = require('./rsa-browser')
} else {
  const crypto = require('crypto')
  const keypair = require('keypair')
  const setImmediate = require('async/setImmediate')
  const pemToJwk = require('pem-jwk').pem2jwk
  const jwkToPem = require('pem-jwk').jwk2pem

  exports.utils = require('./rsa-utils')

  exports.generateKey = function (bits, callback) {
    const done = (err, res) => setImmediate(() => {
      callback(err, res)
    })

    let key
    try {
      key = keypair({
        bits: bits
      })
    } catch (err) {
      done(err)
      return
    }

    done(null, {
      privateKey: pemToJwk(key.private),
      publicKey: pemToJwk(key.public)
    })
  }

  // Takes a jwk key
  exports.unmarshalPrivateKey = function (key, callback) {
    callback(null, {
      privateKey: key,
      publicKey: {
        kty: key.kty,
        n: key.n,
        e: key.e
      }
    })
  }

  exports.getRandomValues = function (arr) {
    return crypto.randomBytes(arr.length)
  }

  exports.hashAndSign = function (key, msg, callback) {
    const sign = crypto.createSign('RSA-SHA256')

    sign.update(msg)
    setImmediate(() => {
      callback(null, sign.sign(jwkToPem(key)))
    })
  }

  exports.hashAndVerify = function (key, sig, msg, callback) {
    const verify = crypto.createVerify('RSA-SHA256')

    verify.update(msg)

    setImmediate(() => {
      callback(null, verify.verify(jwkToPem(key), sig))
    })
  }
}
