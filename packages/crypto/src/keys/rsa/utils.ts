import { InvalidParametersError, InvalidPublicKeyError } from '@libp2p/interface'
import { pbkdf2Async } from '@noble/hashes/pbkdf2'
import { sha256 } from '@noble/hashes/sha256'
import { sha512 } from '@noble/hashes/sha512'
import * as asn1js from 'asn1js'
import { create } from 'multiformats/hashes/digest'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import randomBytes from '../../random-bytes.js'
import webcrypto from '../../webcrypto.js'
import { exporter } from '../exporter.js'
import * as pb from '../keys.js'
import { RSAPrivateKey as RSAPrivateKeyClass, RSAPublicKey as RSAPublicKeyClass } from './rsa.js'
import { generateRSAKey, jwkToJWKKeyPair, rsaKeySize } from './index.js'
import { privateKeyToProtobuf } from '../index.js'
import type { ExportFormat } from '../index.js'
import type { RSAPrivateKey, RSAPublicKey } from '@libp2p/interface'
import type { Multibase } from 'multiformats/bases/interface'

export const MAX_RSA_KEY_SIZE = 8192
const SHA2_256_CODE = 0x12

/**
 * Convert a PKCS#1 in ASN1 DER format to a JWK key
 */
export function pkcs1ToJwk (bytes: Uint8Array): JsonWebKey {
  const { result } = asn1js.fromBER(bytes)

  // @ts-expect-error this looks fragile but DER is a canonical format so we are
  // safe to have deeply property chains like this
  const values: asn1js.Integer[] = result.valueBlock.value

  const key = {
    n: uint8ArrayToString(bnToBuf(values[1].toBigInt()), 'base64url'),
    e: uint8ArrayToString(bnToBuf(values[2].toBigInt()), 'base64url'),
    d: uint8ArrayToString(bnToBuf(values[3].toBigInt()), 'base64url'),
    p: uint8ArrayToString(bnToBuf(values[4].toBigInt()), 'base64url'),
    q: uint8ArrayToString(bnToBuf(values[5].toBigInt()), 'base64url'),
    dp: uint8ArrayToString(bnToBuf(values[6].toBigInt()), 'base64url'),
    dq: uint8ArrayToString(bnToBuf(values[7].toBigInt()), 'base64url'),
    qi: uint8ArrayToString(bnToBuf(values[8].toBigInt()), 'base64url'),
    kty: 'RSA',
    alg: 'RS256'
  }

  return key
}

/**
 * Convert a JWK key into PKCS#1 in ASN1 DER format
 */
export function jwkToPkcs1 (jwk: JsonWebKey): Uint8Array {
  if (jwk.n == null || jwk.e == null || jwk.d == null || jwk.p == null || jwk.q == null || jwk.dp == null || jwk.dq == null || jwk.qi == null) {
    throw new InvalidParametersError('JWK was missing components')
  }

  const root = new asn1js.Sequence({
    value: [
      new asn1js.Integer({ value: 0 }),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.n, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.e, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.d, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.p, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.q, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.dp, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.dq, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.qi, 'base64url')))
    ]
  })

  const der = root.toBER()

  return new Uint8Array(der, 0, der.byteLength)
}

/**
 * Convert a PKIX in ASN1 DER format to a JWK key
 */
export function pkixToJwk (bytes: Uint8Array): JsonWebKey {
  const { result } = asn1js.fromBER(bytes)

  // @ts-expect-error this looks fragile but DER is a canonical format so we are
  // safe to have deeply property chains like this
  const values: asn1js.Integer[] = result.valueBlock.value[1].valueBlock.value[0].valueBlock.value

  return {
    kty: 'RSA',
    n: uint8ArrayToString(bnToBuf(values[0].toBigInt()), 'base64url'),
    e: uint8ArrayToString(bnToBuf(values[1].toBigInt()), 'base64url')
  }
}

/**
 * Convert a JWK key to PKIX in ASN1 DER format
 */
export function jwkToPkix (jwk: JsonWebKey): Uint8Array {
  if (jwk.n == null || jwk.e == null) {
    throw new InvalidParametersError('JWK was missing components')
  }

  const root = new asn1js.Sequence({
    value: [
      new asn1js.Sequence({
        value: [
          // rsaEncryption
          new asn1js.ObjectIdentifier({
            value: '1.2.840.113549.1.1.1'
          }),
          new asn1js.Null()
        ]
      }),
      // this appears to be a bug in asn1js.js - this should really be a Sequence
      // and not a BitString but it generates the same bytes as node-forge so 🤷‍♂️
      new asn1js.BitString({
        valueHex: new asn1js.Sequence({
          value: [
            asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.n, 'base64url'))),
            asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.e, 'base64url')))
          ]
        }).toBER()
      })
    ]
  })

  const der = root.toBER()

  return new Uint8Array(der, 0, der.byteLength)
}

function bnToBuf (bn: bigint): Uint8Array {
  let hex = bn.toString(16)

  if (hex.length % 2 > 0) {
    hex = `0${hex}`
  }

  const len = hex.length / 2
  const u8 = new Uint8Array(len)

  let i = 0
  let j = 0

  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16)
    i += 1
    j += 2
  }

  return u8
}

function bufToBn (u8: Uint8Array): bigint {
  const hex: string[] = []

  u8.forEach(function (i) {
    let h = i.toString(16)

    if (h.length % 2 > 0) {
      h = `0${h}`
    }

    hex.push(h)
  })

  return BigInt('0x' + hex.join(''))
}

const SALT_LENGTH = 16
const KEY_SIZE = 32
const ITERATIONS = 10000

export async function exportToPem (privateKey: RSAPrivateKey, password: string): Promise<string> {
  const crypto = webcrypto.get()

  // PrivateKeyInfo
  const keyWrapper = new asn1js.Sequence({
    value: [
      // version (0)
      new asn1js.Integer({ value: 0 }),

      // privateKeyAlgorithm
      new asn1js.Sequence({
        value: [
        // rsaEncryption OID
          new asn1js.ObjectIdentifier({
            value: '1.2.840.113549.1.1.1'
          }),
          new asn1js.Null()
        ]
      }),

      // PrivateKey
      new asn1js.OctetString({
        valueHex: privateKey.raw
      })
    ]
  })

  const keyBuf = keyWrapper.toBER()
  const keyArr = new Uint8Array(keyBuf, 0, keyBuf.byteLength)
  const salt = randomBytes(SALT_LENGTH)

  const encryptionKey = await pbkdf2Async(
    sha512,
    password,
    salt, {
      c: ITERATIONS,
      dkLen: KEY_SIZE
    }
  )

  const iv = randomBytes(16)
  const cryptoKey = await crypto.subtle.importKey('raw', encryptionKey, 'AES-CBC', false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt({
    name: 'AES-CBC',
    iv
  }, cryptoKey, keyArr)

  const pbkdf2Params = new asn1js.Sequence({
    value: [
      // salt
      new asn1js.OctetString({ valueHex: salt }),

      // iteration count
      new asn1js.Integer({ value: ITERATIONS }),

      // key length
      new asn1js.Integer({ value: KEY_SIZE }),

      // AlgorithmIdentifier
      new asn1js.Sequence({
        value: [
          // hmacWithSHA512
          new asn1js.ObjectIdentifier({ value: '1.2.840.113549.2.11' }),
          new asn1js.Null()
        ]
      })
    ]
  })

  const encryptionAlgorithm = new asn1js.Sequence({
    value: [
      // pkcs5PBES2
      new asn1js.ObjectIdentifier({
        value: '1.2.840.113549.1.5.13'
      }),
      new asn1js.Sequence({
        value: [
          // keyDerivationFunc
          new asn1js.Sequence({
            value: [
              // pkcs5PBKDF2
              new asn1js.ObjectIdentifier({
                value: '1.2.840.113549.1.5.12'
              }),
              // PBKDF2-params
              pbkdf2Params
            ]
          }),

          // encryptionScheme
          new asn1js.Sequence({
            value: [
              // aes256-CBC
              new asn1js.ObjectIdentifier({
                value: '2.16.840.1.101.3.4.1.42'
              }),
              // iv
              new asn1js.OctetString({
                valueHex: iv
              })
            ]
          })
        ]
      })
    ]
  })

  const finalWrapper = new asn1js.Sequence({
    value: [
      encryptionAlgorithm,
      new asn1js.OctetString({ valueHex: encrypted })
    ]
  })

  const finalWrapperBuf = finalWrapper.toBER()
  const finalWrapperArr = new Uint8Array(finalWrapperBuf, 0, finalWrapperBuf.byteLength)

  return [
    '-----BEGIN ENCRYPTED PRIVATE KEY-----',
    ...uint8ArrayToString(finalWrapperArr, 'base64pad').split(/(.{64})/).filter(Boolean),
    '-----END ENCRYPTED PRIVATE KEY-----'
  ].join('\n')
}

export async function importFromPem (pem: string, password: string): Promise<RSAPrivateKey> {
  const crypto = webcrypto.get()
  let plaintext: Uint8Array

  if (pem.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----')) {
    const key = uint8ArrayFromString(
      pem
        .replace('-----BEGIN ENCRYPTED PRIVATE KEY-----', '')
        .replace('-----END ENCRYPTED PRIVATE KEY-----', '')
        .replace(/\n/g, '')
        .trim(),
      'base64pad'
    )

    const { result } = asn1js.fromBER(key)

    const {
      iv,
      salt,
      iterations,
      keySize,
      cipherText
    } = findEncryptedPEMData(result)

    const encryptionKey = await pbkdf2Async(
      sha512,
      password,
      salt, {
        c: iterations,
        dkLen: keySize
      }
    )

    const cryptoKey = await crypto.subtle.importKey('raw', encryptionKey, 'AES-CBC', false, ['decrypt'])
    const decrypted = toUint8Array(await crypto.subtle.decrypt({
      name: 'AES-CBC',
      iv
    }, cryptoKey, cipherText))

    const { result: decryptedResult } = asn1js.fromBER(decrypted)
    plaintext = findPEMData(decryptedResult)
  } else if (pem.includes('-----BEGIN PRIVATE KEY-----')) {
    const key = uint8ArrayFromString(
      pem
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\n/g, '')
        .trim(),
      'base64pad'
    )

    const { result } = asn1js.fromBER(key)

    plaintext = findPEMData(result)
  } else {
    throw new InvalidParametersError('Could not parse private key from PEM data')
  }

  return pkcs1ToRSAPrivateKey(plaintext)
}

function findEncryptedPEMData (root: any): { cipherText: Uint8Array, iv: Uint8Array, salt: Uint8Array, iterations: number, keySize: number } {
  const encryptionAlgorithm = root.valueBlock.value[0]
  const scheme = encryptionAlgorithm.valueBlock.value[0].toString()

  if (scheme !== 'OBJECT IDENTIFIER : 1.2.840.113549.1.5.13') {
    throw new InvalidParametersError('Only pkcs5PBES2 encrypted private keys are supported')
  }

  const keyDerivationFunc = encryptionAlgorithm.valueBlock.value[1].valueBlock.value[0]
  const keyDerivationFuncName = keyDerivationFunc.valueBlock.value[0].toString()

  if (keyDerivationFuncName !== 'OBJECT IDENTIFIER : 1.2.840.113549.1.5.12') {
    throw new InvalidParametersError('Only pkcs5PBKDF2 key derivation functions are supported')
  }

  const pbkdf2Params = keyDerivationFunc.valueBlock.value[1]

  const salt = toUint8Array(pbkdf2Params.valueBlock.value[0].getValue())

  let iterations = ITERATIONS
  let keySize = KEY_SIZE

  if (pbkdf2Params.valueBlock.value.length === 3) {
    iterations = Number((pbkdf2Params.valueBlock.value[1] as asn1js.Integer).toBigInt())
    keySize = Number((pbkdf2Params.valueBlock.value[2]).toBigInt())
  } else if (pbkdf2Params.valueBlock.value.length === 2) {
    throw new InvalidParametersError('Could not derive key size and iterations from PEM file - please use @libp2p/rsa to re-import your key')
  }

  const encryptionScheme = encryptionAlgorithm.valueBlock.value[1].valueBlock.value[1]
  const encryptionSchemeName = encryptionScheme.valueBlock.value[0].toString()

  if (encryptionSchemeName === 'OBJECT IDENTIFIER : 1.2.840.113549.3.7') {
    // des-EDE3-CBC
  } else if (encryptionSchemeName === 'OBJECT IDENTIFIER : 1.3.14.3.2.7') {
    // des-CBC
  } else if (encryptionSchemeName === 'OBJECT IDENTIFIER : 2.16.840.1.101.3.4.1.2') {
    // aes128-CBC
  } else if (encryptionSchemeName === 'OBJECT IDENTIFIER : 2.16.840.1.101.3.4.1.22') {
    // aes192-CBC
  } else if (encryptionSchemeName === 'OBJECT IDENTIFIER : 2.16.840.1.101.3.4.1.42') {
    // aes256-CBC
  } else {
    throw new InvalidParametersError('Only AES-CBC encryption schemes are supported')
  }

  const iv = toUint8Array(encryptionScheme.valueBlock.value[1].getValue())

  return {
    cipherText: toUint8Array(root.valueBlock.value[1].getValue()),
    salt,
    iterations,
    keySize,
    iv
  }
}

function findPEMData (seq: any): Uint8Array {
  return toUint8Array(seq.valueBlock.value[2].getValue())
}

function toUint8Array (buf: ArrayBuffer): Uint8Array {
  return new Uint8Array(buf, 0, buf.byteLength)
}

/**
 * Exports the key as libp2p-key - a aes-gcm encrypted value with the key
 * derived from the password.
 *
 * To export it as a password protected PEM file, please use the `exportPEM`
 * function from `@libp2p/rsa`.
 */
export async function exportRSAPrivateKey (key: RSAPrivateKey, password: string, format: ExportFormat = 'pkcs-8'): Promise<Multibase<'m'>> {
  if (format === 'pkcs-8') {
    return exportToPem(key, password)
  } else if (format === 'libp2p-key') {
    return exporter(privateKeyToProtobuf(key), password)
  } else {
    throw new InvalidParametersError('Export format is not supported')
  }
}

/**
 * Turn PCKS#1 DER bytes to a PrivateKey
 */
export async function pkcs1ToRSAPrivateKey (bytes: Uint8Array): Promise<RSAPrivateKey> {
  const jwk = pkcs1ToJwk(bytes)

  return jwkToRSAPrivateKey(jwk)
}

/**
 * Turn PKIX bytes to a PublicKey
 */
export function pkixToRSAPublicKey (bytes: Uint8Array): RSAPublicKey {
  const jwk = pkixToJwk(bytes)

  if (rsaKeySize(jwk) > MAX_RSA_KEY_SIZE) {
    throw new InvalidPublicKeyError('Key size is too large')
  }

  const hash = sha256(pb.PublicKey.encode({
    Type: pb.KeyType.RSA,
    Data: bytes
  }))
  const digest = create(SHA2_256_CODE, hash)

  return new RSAPublicKeyClass(jwk, digest)
}

export async function jwkToRSAPrivateKey (jwk: JsonWebKey): Promise<RSAPrivateKey> {
  if (rsaKeySize(jwk) > MAX_RSA_KEY_SIZE) {
    throw new InvalidParametersError('Key size is too large')
  }

  const keys = await jwkToJWKKeyPair(jwk)
  const hash = sha256(pb.PublicKey.encode({
    Type: pb.KeyType.RSA,
    Data: jwkToPkix(keys.publicKey)
  }))
  const digest = create(SHA2_256_CODE, hash)

  return new RSAPrivateKeyClass(keys.privateKey, new RSAPublicKeyClass(keys.publicKey, digest))
}

export async function generateRSAKeyPair (bits: number): Promise<RSAPrivateKey> {
  if (bits > MAX_RSA_KEY_SIZE) {
    throw new InvalidParametersError('Key size is too large')
  }

  const keys = await generateRSAKey(bits)
  const hash = sha256(pb.PublicKey.encode({
    Type: pb.KeyType.RSA,
    Data: jwkToPkix(keys.publicKey)
  }))
  const digest = create(SHA2_256_CODE, hash)

  return new RSAPrivateKeyClass(keys.privateKey, new RSAPublicKeyClass(keys.publicKey, digest))
}
