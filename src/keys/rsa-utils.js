'use strict'

const asn1 = require('asn1.js')

const util = require('./../util')
const toBase64 = util.toBase64
const toBn = util.toBn

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

const AlgorithmIdentifier = asn1.define('AlgorithmIdentifier', function () {
  this.seq().obj(
    this.key('algorithm').objid({
      '1.2.840.113549.1.1.1': 'rsa'
    }),
    this.key('none').optional().null_(),
    this.key('curve').optional().objid(),
    this.key('params').optional().seq().obj(
      this.key('p').int(),
      this.key('q').int(),
      this.key('g').int()
    )
  )
})

const PublicKey = asn1.define('RSAPublicKey', function () {
  this.seq().obj(
    this.key('algorithm').use(AlgorithmIdentifier),
    this.key('subjectPublicKey').bitstr()
  )
})

const RSAPublicKey = asn1.define('RSAPublicKey', function () {
  this.seq().obj(
    this.key('modulus').int(),
    this.key('publicExponent').int()
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

// Convert a JWK key into PKCS#1 in ASN1 DER format
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

// Convert a PKCIX in ASN1 DER format to a JWK key
exports.pkixToJwk = function (bytes) {
  const ndata = PublicKey.decode(bytes, 'der')
  const asn1 = RSAPublicKey.decode(ndata.subjectPublicKey.data, 'der')

  return {
    kty: 'RSA',
    n: toBase64(asn1.modulus),
    e: toBase64(asn1.publicExponent),
    alg: 'RS256',
    kid: '2011-04-29'
  }
}

// Convert a JWK key to PKCIX in ASN1 DER format
exports.jwkToPkix = function (jwk) {
  return PublicKey.encode({
    algorithm: {
      algorithm: 'rsa',
      none: null
    },
    subjectPublicKey: {
      data: RSAPublicKey.encode({
        modulus: toBn(jwk.n),
        publicExponent: toBn(jwk.e)
      }, 'der')
    }
  }, 'der')
}
