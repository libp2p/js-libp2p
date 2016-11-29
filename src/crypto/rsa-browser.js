'use strict'

const nodeify = require('nodeify')

const crypto = require('./webcrypto')()

exports.utils = require('./rsa-utils')

exports.generateKey = function (bits, callback) {
  nodeify(crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: bits,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: {name: 'SHA-256'}
    },
    true,
    ['sign', 'verify']
  )
  .then(exportKey)
  .then((keys) => ({
    privateKey: keys[0],
    publicKey: keys[1]
  })), callback)
}

// Takes a jwk key
exports.unmarshalPrivateKey = function (key, callback) {
  const privateKey = crypto.subtle.importKey(
    'jwk',
    key,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: {name: 'SHA-256'}
    },
    true,
    ['sign']
  )

  nodeify(Promise.all([
    privateKey,
    derivePublicFromPrivate(key)
  ]).then((keys) => exportKey({
    privateKey: keys[0],
    publicKey: keys[1]
  })).then((keys) => ({
    privateKey: keys[0],
    publicKey: keys[1]
  })), callback)
}

exports.getRandomValues = function (arr) {
  return Buffer.from(crypto.getRandomValues(arr))
}

exports.hashAndSign = function (key, msg, callback) {
  nodeify(crypto.subtle.importKey(
    'jwk',
    key,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: {name: 'SHA-256'}
    },
    false,
    ['sign']
  ).then((privateKey) => {
    return crypto.subtle.sign(
      {name: 'RSASSA-PKCS1-v1_5'},
      privateKey,
      Uint8Array.from(msg)
    )
  }).then((sig) => Buffer.from(sig)), callback)
}

exports.hashAndVerify = function (key, sig, msg, callback) {
  nodeify(crypto.subtle.importKey(
    'jwk',
    key,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: {name: 'SHA-256'}
    },
    false,
    ['verify']
  ).then((publicKey) => {
    return crypto.subtle.verify(
      {name: 'RSASSA-PKCS1-v1_5'},
      publicKey,
      sig,
      msg
    )
  }), callback)
}

function exportKey (pair) {
  return Promise.all([
    crypto.subtle.exportKey('jwk', pair.privateKey),
    crypto.subtle.exportKey('jwk', pair.publicKey)
  ])
}

function derivePublicFromPrivate (jwKey) {
  return crypto.subtle.importKey(
    'jwk',
    {
      kty: jwKey.kty,
      n: jwKey.n,
      e: jwKey.e,
      alg: jwKey.alg,
      kid: jwKey.kid
    },
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: {name: 'SHA-256'}
    },
    true,
    ['verify']
  )
}
