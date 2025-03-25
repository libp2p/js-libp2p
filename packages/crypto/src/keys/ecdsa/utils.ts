import { InvalidParametersError } from '@libp2p/interface'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { decodeDer, encodeBitString, encodeInteger, encodeOctetString, encodeSequence } from '../rsa/der.js'
import { ECDSAPrivateKey as ECDSAPrivateKeyClass, ECDSAPublicKey as ECDSAPublicKeyClass } from './ecdsa.js'
import { generateECDSAKey } from './index.js'
import type { Curve } from '../ecdh/index.js'
import type { ECDSAPublicKey, ECDSAPrivateKey } from '@libp2p/interface'

// 1.2.840.10045.3.1.7 prime256v1 (ANSI X9.62 named elliptic curve)
const OID_256 = Uint8Array.from([0x06, 0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07])
// 1.3.132.0.34 secp384r1 (SECG (Certicom) named elliptic curve)
const OID_384 = Uint8Array.from([0x06, 0x05, 0x2B, 0x81, 0x04, 0x00, 0x22])
// 1.3.132.0.35 secp521r1 (SECG (Certicom) named elliptic curve)
const OID_521 = Uint8Array.from([0x06, 0x05, 0x2B, 0x81, 0x04, 0x00, 0x23])

const P_256_KEY_JWK = {
  ext: true,
  kty: 'EC',
  crv: 'P-256'
}

const P_384_KEY_JWK = {
  ext: true,
  kty: 'EC',
  crv: 'P-384'
}

const P_521_KEY_JWK = {
  ext: true,
  kty: 'EC',
  crv: 'P-521'
}

const P_256_KEY_LENGTH = 32
const P_384_KEY_LENGTH = 48
const P_521_KEY_LENGTH = 66

export function unmarshalECDSAPrivateKey (bytes: Uint8Array): ECDSAPrivateKey {
  const message = decodeDer(bytes)

  return pkiMessageToECDSAPrivateKey(message)
}

export function pkiMessageToECDSAPrivateKey (message: any): ECDSAPrivateKey {
  const privateKey = message[1]
  const d = uint8ArrayToString(privateKey, 'base64url')
  const coordinates: Uint8Array = message[2][1][0]
  const offset = 1
  let x: string
  let y: string

  if (privateKey.byteLength === P_256_KEY_LENGTH) {
    x = uint8ArrayToString(coordinates.subarray(offset, offset + P_256_KEY_LENGTH), 'base64url')
    y = uint8ArrayToString(coordinates.subarray(offset + P_256_KEY_LENGTH), 'base64url')

    return new ECDSAPrivateKeyClass({
      ...P_256_KEY_JWK,
      key_ops: ['sign'],
      d,
      x,
      y
    })
  }

  if (privateKey.byteLength === P_384_KEY_LENGTH) {
    x = uint8ArrayToString(coordinates.subarray(offset, offset + P_384_KEY_LENGTH), 'base64url')
    y = uint8ArrayToString(coordinates.subarray(offset + P_384_KEY_LENGTH), 'base64url')

    return new ECDSAPrivateKeyClass({
      ...P_384_KEY_JWK,
      key_ops: ['sign'],
      d,
      x,
      y
    })
  }

  if (privateKey.byteLength === P_521_KEY_LENGTH) {
    x = uint8ArrayToString(coordinates.subarray(offset, offset + P_521_KEY_LENGTH), 'base64url')
    y = uint8ArrayToString(coordinates.subarray(offset + P_521_KEY_LENGTH), 'base64url')

    return new ECDSAPrivateKeyClass({
      ...P_521_KEY_JWK,
      key_ops: ['sign'],
      d,
      x,
      y
    })
  }

  throw new InvalidParametersError(`Private key length was wrong length, got ${privateKey.byteLength}, expected 32, 48 or 66`)
}

export function unmarshalECDSAPublicKey (bytes: Uint8Array): ECDSAPublicKey {
  const message = decodeDer(bytes)

  return pkiMessageToECDSAPublicKey(message)
}

export function pkiMessageToECDSAPublicKey (message: any): ECDSAPublicKey {
  const coordinates = message[1][1][0]
  const offset = 1
  let x: string
  let y: string

  if (coordinates.byteLength === ((P_256_KEY_LENGTH * 2) + 1)) {
    x = uint8ArrayToString(coordinates.subarray(offset, offset + P_256_KEY_LENGTH), 'base64url')
    y = uint8ArrayToString(coordinates.subarray(offset + P_256_KEY_LENGTH), 'base64url')

    return new ECDSAPublicKeyClass({
      ...P_256_KEY_JWK,
      key_ops: ['verify'],
      x,
      y
    })
  }

  if (coordinates.byteLength === ((P_384_KEY_LENGTH * 2) + 1)) {
    x = uint8ArrayToString(coordinates.subarray(offset, offset + P_384_KEY_LENGTH), 'base64url')
    y = uint8ArrayToString(coordinates.subarray(offset + P_384_KEY_LENGTH), 'base64url')

    return new ECDSAPublicKeyClass({
      ...P_384_KEY_JWK,
      key_ops: ['verify'],
      x,
      y
    })
  }

  if (coordinates.byteLength === ((P_521_KEY_LENGTH * 2) + 1)) {
    x = uint8ArrayToString(coordinates.subarray(offset, offset + P_521_KEY_LENGTH), 'base64url')
    y = uint8ArrayToString(coordinates.subarray(offset + P_521_KEY_LENGTH), 'base64url')

    return new ECDSAPublicKeyClass({
      ...P_521_KEY_JWK,
      key_ops: ['verify'],
      x,
      y
    })
  }

  throw new InvalidParametersError(`coordinates were wrong length, got ${coordinates.byteLength}, expected 65, 97 or 133`)
}

export function privateKeyToPKIMessage (privateKey: JsonWebKey): Uint8Array {
  return encodeSequence([
    encodeInteger(Uint8Array.from([1])), // header
    encodeOctetString(uint8ArrayFromString(privateKey.d ?? '', 'base64url')), // body
    encodeSequence([ // PKIProtection
      getOID(privateKey.crv)
    ], 0xA0),
    encodeSequence([ // extraCerts
      encodeBitString(
        new Uint8ArrayList(
          Uint8Array.from([0x04]),
          uint8ArrayFromString(privateKey.x ?? '', 'base64url'),
          uint8ArrayFromString(privateKey.y ?? '', 'base64url')
        )
      )
    ], 0xA1)
  ]).subarray()
}

export function publicKeyToPKIMessage (publicKey: JsonWebKey): Uint8Array {
  return encodeSequence([
    encodeInteger(Uint8Array.from([1])), // header
    encodeSequence([ // PKIProtection
      getOID(publicKey.crv)
    ], 0xA0),
    encodeSequence([ // extraCerts
      encodeBitString(
        new Uint8ArrayList(
          Uint8Array.from([0x04]),
          uint8ArrayFromString(publicKey.x ?? '', 'base64url'),
          uint8ArrayFromString(publicKey.y ?? '', 'base64url')
        )
      )
    ], 0xA1)
  ]).subarray()
}

function getOID (curve?: string): Uint8Array {
  if (curve === 'P-256') {
    return OID_256
  }

  if (curve === 'P-384') {
    return OID_384
  }

  if (curve === 'P-521') {
    return OID_521
  }

  throw new InvalidParametersError(`Invalid curve ${curve}`)
}

export async function generateECDSAKeyPair (curve: Curve = 'P-256'): Promise<ECDSAPrivateKey> {
  const key = await generateECDSAKey(curve)

  return new ECDSAPrivateKeyClass(key.privateKey)
}

export function ensureECDSAKey (key: Uint8Array, length: number): Uint8Array {
  key = Uint8Array.from(key ?? [])
  if (key.length !== length) {
    throw new InvalidParametersError(`Key must be a Uint8Array of length ${length}, got ${key.length}`)
  }
  return key
}
