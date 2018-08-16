'use strict'

const crypto = require('crypto')
let keypair
try {
  if (process.env.LP2P_FORCE_CRYPTO_LIB === 'keypair') {
    throw new Error('Force keypair usage')
  }

  const ursa = require('ursa-optional') // throws if not compiled
  keypair = ({bits}) => {
    const key = ursa.generatePrivateKey(bits)
    return {
      private: key.toPrivatePem(),
      public: key.toPublicPem()
    }
  }
} catch (e) {
  if (process.env.LP2P_FORCE_CRYPTO_LIB === 'ursa') {
    throw e
  }

  keypair = require('keypair')
}
const setImmediate = require('async/setImmediate')
const pemToJwk = require('pem-jwk').pem2jwk
const jwkToPem = require('pem-jwk').jwk2pem

exports.utils = require('./rsa-utils')

exports.generateKey = function (bits, callback) {
  setImmediate(() => {
    let result
    try {
      const key = keypair({ bits: bits })
      result = {
        privateKey: pemToJwk(key.private),
        publicKey: pemToJwk(key.public)
      }
    } catch (err) {
      return callback(err)
    }

    callback(null, result)
  })
}

// Takes a jwk key
exports.unmarshalPrivateKey = function (key, callback) {
  setImmediate(() => {
    if (!key) {
      return callback(new Error('Key is invalid'))
    }
    callback(null, {
      privateKey: key,
      publicKey: {
        kty: key.kty,
        n: key.n,
        e: key.e
      }
    })
  })
}

exports.getRandomValues = function (arr) {
  return crypto.randomBytes(arr.length)
}

exports.hashAndSign = function (key, msg, callback) {
  setImmediate(() => {
    let result
    try {
      const sign = crypto.createSign('RSA-SHA256')
      sign.update(msg)
      const pem = jwkToPem(key)
      result = sign.sign(pem)
    } catch (err) {
      return callback(new Error('Key or message is invalid!: ' + err.message))
    }

    callback(null, result)
  })
}

exports.hashAndVerify = function (key, sig, msg, callback) {
  setImmediate(() => {
    let result
    try {
      const verify = crypto.createVerify('RSA-SHA256')
      verify.update(msg)
      const pem = jwkToPem(key)
      result = verify.verify(pem, sig)
    } catch (err) {
      return callback(new Error('Key or message is invalid!:' + err.message))
    }

    callback(null, result)
  })
}
