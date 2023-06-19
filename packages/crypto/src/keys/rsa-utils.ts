import 'node-forge/lib/asn1.js'
import 'node-forge/lib/rsa.js'
import { CodeError } from '@libp2p/interfaces/errors'
// @ts-expect-error types are missing
import forge from 'node-forge/lib/forge.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { bigIntegerToUintBase64url, base64urlToBigInteger } from './../util.js'

// Convert a PKCS#1 in ASN1 DER format to a JWK key
export function pkcs1ToJwk (bytes: Uint8Array): JsonWebKey {
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
    alg: 'RS256'
  }
}

// Convert a JWK key into PKCS#1 in ASN1 DER format
export function jwkToPkcs1 (jwk: JsonWebKey): Uint8Array {
  if (jwk.n == null || jwk.e == null || jwk.d == null || jwk.p == null || jwk.q == null || jwk.dp == null || jwk.dq == null || jwk.qi == null) {
    throw new CodeError('JWK was missing components', 'ERR_INVALID_PARAMETERS')
  }

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
export function pkixToJwk (bytes: Uint8Array): JsonWebKey {
  const asn1 = forge.asn1.fromDer(uint8ArrayToString(bytes, 'ascii'))
  const publicKey = forge.pki.publicKeyFromAsn1(asn1)

  return {
    kty: 'RSA',
    n: bigIntegerToUintBase64url(publicKey.n),
    e: bigIntegerToUintBase64url(publicKey.e)
  }
}

// Convert a JWK key to PKCIX in ASN1 DER format
export function jwkToPkix (jwk: JsonWebKey): Uint8Array {
  if (jwk.n == null || jwk.e == null) {
    throw new CodeError('JWK was missing components', 'ERR_INVALID_PARAMETERS')
  }

  const asn1 = forge.pki.publicKeyToAsn1({
    n: base64urlToBigInteger(jwk.n),
    e: base64urlToBigInteger(jwk.e)
  })

  return uint8ArrayFromString(forge.asn1.toDer(asn1).getBytes(), 'ascii')
}
