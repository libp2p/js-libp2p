import { AES_GCM } from '@libp2p/crypto/ciphers'
import { privateKeyFromProtobuf, privateKeyFromRaw } from '@libp2p/crypto/keys'
import webcrypto from '@libp2p/crypto/webcrypto'
import { InvalidParametersError } from '@libp2p/interface'
import { pbkdf2Async } from '@noble/hashes/pbkdf2'
import { sha512 } from '@noble/hashes/sha512'
import * as asn1js from 'asn1js'
import { base64 } from 'multiformats/bases/base64'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { ITERATIONS, KEY_SIZE } from './constants.js'
import type { PrivateKey, RSAPrivateKey } from '@libp2p/interface'

/**
 * Converts an exported private key into its representative object.
 *
 * Supported formats are 'pem' (RSA only) and 'libp2p-key'.
 */
export async function importPrivateKey (encryptedKey: string, password: string): Promise<PrivateKey> {
  try {
    const key = await importer(encryptedKey, password)
    return privateKeyFromProtobuf(key)
  } catch {
    // Ignore and try the old pem decrypt
  }

  if (!encryptedKey.includes('BEGIN')) {
    throw new InvalidParametersError('Encrypted key was not a libp2p-key or a PEM file')
  }

  return importFromPem(encryptedKey, password)
}

/**
 * Attempts to decrypt a base64 encoded PrivateKey string
 * with the given password. The privateKey must have been exported
 * using the same password and underlying cipher (aes-gcm)
 */
export async function importer (privateKey: string, password: string): Promise<Uint8Array> {
  const encryptedKey = base64.decode(privateKey)
  const cipher = AES_GCM.create()
  return cipher.decrypt(encryptedKey, password)
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

  const key = privateKeyFromRaw(plaintext)

  if (key.type !== 'RSA') {
    throw new InvalidParametersError('Could not parse RSA private key from PEM data')
  }

  return key
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
