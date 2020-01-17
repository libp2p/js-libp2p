'use strict'

const crypto = require('crypto')
const errcode = require('err-code')
const randomBytes = require('../random-bytes')
// @ts-check
/**
 * @type {PrivateKey}
 */
let keypair
try {
  if (process.env.LP2P_FORCE_CRYPTO_LIB === 'keypair') {
    throw new Error('Force keypair usage')
  }

  const ursa = require('ursa-optional') // throws if not compiled
  keypair = ({ bits }) => {
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
const pemToJwk = require('pem-jwk').pem2jwk
const jwkToPem = require('pem-jwk').jwk2pem

exports.utils = require('./rsa-utils')

exports.generateKey = async function (bits) { // eslint-disable-line require-await
  const key = keypair({ bits })
  return {
    privateKey: pemToJwk(key.private),
    publicKey: pemToJwk(key.public)
  }
}

// Takes a jwk key
exports.unmarshalPrivateKey = async function (key) { // eslint-disable-line require-await
  if (!key) {
    throw errcode(new Error('Missing key parameter'), 'ERR_MISSING_KEY')
  }
  return {
    privateKey: key,
    publicKey: {
      kty: key.kty,
      n: key.n,
      e: key.e
    }
  }
}

exports.getRandomValues = randomBytes

exports.hashAndSign = async function (key, msg) { // eslint-disable-line require-await
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(msg)
  const pem = jwkToPem(key)
  return sign.sign(pem)
}

exports.hashAndVerify = async function (key, sig, msg) { // eslint-disable-line require-await
  const verify = crypto.createVerify('RSA-SHA256')
  verify.update(msg)
  const pem = jwkToPem(key)
  return verify.verify(pem, sig)
}

const padding = crypto.constants.RSA_PKCS1_PADDING

exports.encrypt = function (key, bytes) {
  return crypto.publicEncrypt({ key: jwkToPem(key), padding }, bytes)
}

exports.decrypt = function (key, bytes) {
  return crypto.privateDecrypt({ key: jwkToPem(key), padding }, bytes)
}
