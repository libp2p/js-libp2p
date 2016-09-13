'use strict'

const multihashing = require('multihashing')
const nodeify = require('nodeify')
const BN = require('bn.js')
const asn1 = require('asn1.js')

const crypto = require('./webcrypto')()

const sha2256 = multihashing.createHash('sha2-256')

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
  .then((keys) => {
    return {
      privateKey: keys[0],
      publicKey: Buffer.from(keys[1])
    }
  }), callback)
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
    derivePublicFromPrivate(privateKey)
  ]).then((keys) => {
    return exportKey({
      privateKey: keys[0],
      publicKey: keys[1]
    })
  }).then((keys) => {
    return {
      privateKey: keys[0],
      publicKey: Buffer.from(keys[1])
    }
  }), callback)
}

exports.getRandomValues = function (arr) {
  return Buffer.from(crypto.getRandomValues(arr))
}

exports.hashAndSign = function (key, msg, callback) {
  sha2256(msg, (err, digest) => {
    if (err) {
      return callback(err)
    }

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
        Uint8Array.from(digest)
      )
    }).then((sig) => Buffer.from(sig)), callback)
  })
}

exports.hashAndVerify = function (key, sig, msg, callback) {
  sha2256(msg, (err, digest) => {
    if (err) {
      return callback(err)
    }

    nodeify(crypto.subtle.importKey(
      'spki',
      Uint8Array.from(key),
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
        Uint8Array.from(sig),
        Uint8Array.from(digest)
      )
    }), callback)
  })
}

function exportKey (pair) {
  return Promise.all([
    crypto.subtle.exportKey('jwk', pair.privateKey),
    crypto.subtle.exportKey('spki', pair.publicKey)
  ])
}

function derivePublicFromPrivate (privatePromise) {
  return privatePromise.then((privateKey) => {
    return crypto.subtle.exportKey('jwk', privateKey)
  }).then((jwKey) => crypto.subtle.importKey(
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
  ))
}

const RSAPrivateKey = asn1.define('RSAPrivateKey', function () {
  this.seq().obj(
    this.key('version').int(),
    this.key('modulus').int(),
    this.key('publicExponent').int(),
    this.key('privateExponent').int(),
    this.key('prime1').int(),
    this.key('prime2').int(),
    this.key('exponent1').int(),
    this.key('exponent2').int(),
    this.key('coefficient').int()
  )
})

// Convert a PKCS#1 in ASN1 DER format to a JWK key
exports.pkcs1ToJwk = function (bytes) {
  const asn1 = RSAPrivateKey.decode(bytes, 'der')

  return {
    kty: 'RSA',
    n: toBase64(asn1.modulus),
    e: toBase64(asn1.publicExponent),
    d: toBase64(asn1.privateExponent),
    p: toBase64(asn1.prime1),
    q: toBase64(asn1.prime2),
    dp: toBase64(asn1.exponent1),
    dq: toBase64(asn1.exponent2),
    qi: toBase64(asn1.coefficient),
    alg: 'RS256',
    kid: '2011-04-29'
  }
}

exports.jwkToPkcs1 = function (jwk) {
  return RSAPrivateKey.encode({
    version: 0,
    modulus: toBn(jwk.n),
    publicExponent: toBn(jwk.e),
    privateExponent: toBn(jwk.d),
    prime1: toBn(jwk.p),
    prime2: toBn(jwk.q),
    exponent1: toBn(jwk.dp),
    exponent2: toBn(jwk.dq),
    coefficient: toBn(jwk.qi)
  }, 'der')
}

// Convert a BN.js instance to a base64 encoded string without padding
// Adapted from https://tools.ietf.org/html/draft-ietf-jose-json-web-signature-41#appendix-C
function toBase64 (bn) {
  let s = bn.toBuffer('be').toString('base64')

  return s
    .replace(/(=*)$/, '') // Remove any trailing '='s
    .replace(/\+/g, '-')  // 62nd char of encoding
    .replace(/\//g, '_')  // 63rd char of encoding
}

// Convert a base64 encoded string to a BN.js instance
function toBn (str) {
  return new BN(Buffer.from(str, 'base64'))
}
