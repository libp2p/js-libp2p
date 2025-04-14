import { randomBytes } from '@libp2p/crypto'
import { AES_GCM } from '@libp2p/crypto/ciphers'
import { privateKeyToProtobuf } from '@libp2p/crypto/keys'
import webcrypto from '@libp2p/crypto/webcrypto'
import { InvalidParametersError, UnsupportedKeyTypeError } from '@libp2p/interface'
import { pbkdf2Async } from '@noble/hashes/pbkdf2'
import { sha512 } from '@noble/hashes/sha512'
import * as asn1js from 'asn1js'
import { base64 } from 'multiformats/bases/base64'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { ITERATIONS, KEY_SIZE, SALT_LENGTH } from './constants.js'
import type { ECDSAPrivateKey, Ed25519PrivateKey, PrivateKey, RSAPrivateKey, Secp256k1PrivateKey } from '@libp2p/interface'
import type { Multibase } from 'multiformats/bases/interface'

/**
 * Exports the given PrivateKey as a base64 encoded string.
 * The PrivateKey is encrypted via a password derived PBKDF2 key
 * leveraging the aes-gcm cipher algorithm.
 */
export async function exporter (privateKey: Uint8Array, password: string): Promise<Multibase<'m'>> {
  const cipher = AES_GCM.create()
  const encryptedKey = await cipher.encrypt(privateKey, password)
  return base64.encode(encryptedKey)
}

export type ExportFormat = 'pkcs-8' | 'libp2p-key'

/**
 * Converts an exported private key into its representative object.
 *
 * Supported formats are 'pem' (RSA only) and 'libp2p-key'.
 */
export async function exportPrivateKey (key: PrivateKey, password: string, format?: ExportFormat): Promise<Multibase<'m'>> {
  if (key.type === 'RSA') {
    return exportRSAPrivateKey(key, password, format)
  }

  if (key.type === 'Ed25519') {
    return exportEd25519PrivateKey(key, password, format)
  }

  if (key.type === 'secp256k1') {
    return exportSecp256k1PrivateKey(key, password, format)
  }

  if (key.type === 'ECDSA') {
    return exportECDSAPrivateKey(key, password, format)
  }

  throw new UnsupportedKeyTypeError()
}

/**
 * Exports the key into a password protected `format`
 */
export async function exportEd25519PrivateKey (key: Ed25519PrivateKey, password: string, format: ExportFormat = 'libp2p-key'): Promise<Multibase<'m'>> {
  if (format === 'libp2p-key') {
    return exporter(privateKeyToProtobuf(key), password)
  } else {
    throw new InvalidParametersError(`export format '${format}' is not supported`)
  }
}

/**
 * Exports the key into a password protected `format`
 */
export async function exportSecp256k1PrivateKey (key: Secp256k1PrivateKey, password: string, format: ExportFormat = 'libp2p-key'): Promise<Multibase<'m'>> {
  if (format === 'libp2p-key') {
    return exporter(privateKeyToProtobuf(key), password)
  } else {
    throw new InvalidParametersError('Export format is not supported')
  }
}

/**
 * Exports the key into a password protected `format`
 */
export async function exportECDSAPrivateKey (key: ECDSAPrivateKey, password: string, format: ExportFormat = 'libp2p-key'): Promise<Multibase<'m'>> {
  if (format === 'libp2p-key') {
    return exporter(privateKeyToProtobuf(key), password)
  } else {
    throw new InvalidParametersError(`export format '${format}' is not supported`)
  }
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
