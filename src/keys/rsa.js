'use strict'

const crypto = require('crypto')
const promisify = require('util').promisify
const errcode = require('err-code')
const randomBytes = require('../random-bytes')
const keypair = promisify(crypto.generateKeyPair)

exports.utils = require('./rsa-utils')

exports.generateKey = async function (bits) { // eslint-disable-line require-await
  const key = await keypair('rsa', {
    modulusLength: bits,
    publicKeyEncoding: { type: 'pkcs1', format: 'jwk' },
    privateKeyEncoding: { type: 'pkcs1', format: 'jwk' }
  })

  return {
    privateKey: key.privateKey,
    publicKey: key.publicKey
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
  return crypto.createSign('RSA-SHA256')
    .update(msg)
    .sign({ format: 'jwk', key: key })
}

exports.hashAndVerify = async function (key, sig, msg) { // eslint-disable-line require-await
  return crypto.createVerify('RSA-SHA256')
    .update(msg)
    .verify({ format: 'jwk', key: key }, sig)
}

const padding = crypto.constants.RSA_PKCS1_PADDING

exports.encrypt = function (key, bytes) {
  return crypto.publicEncrypt({ format: 'jwk', key, padding }, bytes)
}

exports.decrypt = function (key, bytes) {
  return crypto.privateDecrypt({ format: 'jwk', key, padding }, bytes)
}
