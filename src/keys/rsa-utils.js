'use strict'

require('node-forge/lib/asn1')
require('node-forge/lib/rsa')
const forge = require('node-forge/lib/forge')
const { bigIntegerToUintBase64url, base64urlToBigInteger } = require('./../util')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

// Convert a PKCS#1 in ASN1 DER format to a JWK key
exports.pkcs1ToJwk = function (bytes) {
  const asn1 = forge.asn1.fromDer(uint8ArrayToString(bytes, 'ascii'))
  const privateKey = forge.pki.privateKeyFromAsn1(asn1)

  // https://tools.ietf.org/html/rfc7518#section-6.3.1
  return {
    kty: 'RSA',
    n: bigIntegerToUintBase64url(privateKey.n),
    e: bigIntegerToUintBase64url(privateKey.e),
    d: bigIntegerToUintBase64url(privateKey.d),
    p: bigIntegerToUintBase64url(privateKey.p),
    q: bigIntegerToUintBase64url(privateKey.q),
    dp: bigIntegerToUintBase64url(privateKey.dP),
    dq: bigIntegerToUintBase64url(privateKey.dQ),
    qi: bigIntegerToUintBase64url(privateKey.qInv),
    alg: 'RS256',
    kid: '2011-04-29'
  }
}

// Convert a JWK key into PKCS#1 in ASN1 DER format
exports.jwkToPkcs1 = function (jwk) {
  const asn1 = forge.pki.privateKeyToAsn1({
    n: base64urlToBigInteger(jwk.n),
    e: base64urlToBigInteger(jwk.e),
    d: base64urlToBigInteger(jwk.d),
    p: base64urlToBigInteger(jwk.p),
    q: base64urlToBigInteger(jwk.q),
    dP: base64urlToBigInteger(jwk.dp),
    dQ: base64urlToBigInteger(jwk.dq),
    qInv: base64urlToBigInteger(jwk.qi)
  })

  return uint8ArrayFromString(forge.asn1.toDer(asn1).getBytes(), 'ascii')
}

// Convert a PKCIX in ASN1 DER format to a JWK key
exports.pkixToJwk = function (bytes) {
  const asn1 = forge.asn1.fromDer(uint8ArrayToString(bytes, 'ascii'))
  const publicKey = forge.pki.publicKeyFromAsn1(asn1)

  return {
    kty: 'RSA',
    n: bigIntegerToUintBase64url(publicKey.n),
    e: bigIntegerToUintBase64url(publicKey.e),
    alg: 'RS256',
    kid: '2011-04-29'
  }
}

// Convert a JWK key to PKCIX in ASN1 DER format
exports.jwkToPkix = function (jwk) {
  const asn1 = forge.pki.publicKeyToAsn1({
    n: base64urlToBigInteger(jwk.n),
    e: base64urlToBigInteger(jwk.e)
  })

  return uint8ArrayFromString(forge.asn1.toDer(asn1).getBytes(), 'ascii')
}
