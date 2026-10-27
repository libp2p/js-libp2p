import { pbkdf2Async } from '@noble/hashes/pbkdf2.js'
import { sha256, sha384, sha512 } from '@noble/hashes/sha2.js'
import { base64, base64url } from 'multiformats/bases/base64'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { withArrayBuffer } from 'uint8arrays/with-array-buffer'
import { DecryptionFailedError } from './errors.ts'

const SALT_LENGTH = 16
const IV_LENGTH = 12
const ENTRY_KDF = { iterations: 32_767, hash: 'SHA-256', keyLength: 128 } as const
const NOBLE_HASHES = { 'SHA-256': sha256, 'SHA-384': sha384, 'SHA-512': sha512 } as const

export const KEY_LENGTHS = { 'SHA-256': 128, 'SHA-384': 192, 'SHA-512': 256 } as const

export type DekHash = keyof typeof NOBLE_HASHES

/**
 * WebKit on Linux refuses PBKDF2 with an empty password, so earlier versions
 * encrypted with this key, derived with an all-zero salt, instead
 */
export const PRECOMPUTED_EMPTY_PASSWORD_KEY: JsonWebKey = {
  alg: 'A128GCM',
  ext: true,
  /* spell-checker:disable-next-line */
  k: 'scm9jmO_4BJAgdwWGVulLg',
  key_ops: ['encrypt', 'decrypt'],
  kty: 'oct'
}

export interface DekOptions {
  salt: Uint8Array<ArrayBuffer>
  iterations: number
  hash: DekHash
}

/**
 * PBKDF2 with WebCrypto, falling back to JS when WebCrypto refuses an empty
 * password (WebKit on Linux)
 */
export async function pbkdf2Bytes (password: Uint8Array, salt: Uint8Array, iterations: number, hash: DekHash, bits: number): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const key = await crypto.subtle.importKey('raw', withArrayBuffer(password), 'PBKDF2', false, ['deriveBits'])
    const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: withArrayBuffer(salt), iterations, hash }, key, bits)

    return new Uint8Array(derived)
  } catch (err) {
    if (password.byteLength !== 0) {
      throw err
    }

    return withArrayBuffer(await pbkdf2Async(NOBLE_HASHES[hash], password, salt, { c: iterations, dkLen: bits / 8 }))
  }
}

/**
 * Derives the keychain Data Encryption Key from the password, an empty string
 * when there is no password
 */
export async function deriveDek (password: string, options: DekOptions): Promise<string> {
  if (password === '') {
    return ''
  }

  const bytes = await pbkdf2Bytes(uint8ArrayFromString(password), options.salt, options.iterations, options.hash, KEY_LENGTHS[options.hash])

  return base64url.baseEncode(bytes)
}

async function entryKey (dek: string, salt: Uint8Array, usage: KeyUsage): Promise<CryptoKey> {
  const bytes = await pbkdf2Bytes(uint8ArrayFromString(dek), salt, ENTRY_KDF.iterations, ENTRY_KDF.hash, ENTRY_KDF.keyLength)

  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, [usage])
}

/**
 * Encrypts a keychain entry as multibase base64 of salt, iv and ciphertext
 */
export async function encryptEntry (dek: string, plaintext: Uint8Array): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await entryKey(dek, salt, 'encrypt')
  const cipherText = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, withArrayBuffer(plaintext)))

  return base64.encode(uint8ArrayConcat([salt, iv, cipherText]))
}

/**
 * Decrypts an AES-GCM keychain entry written by `encryptEntry`
 */
export async function decryptEntry (dek: string, text: string): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const bytes = base64.decode(text)
    const salt = bytes.subarray(0, SALT_LENGTH)
    const iv = withArrayBuffer(bytes.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH))
    const cipherText = withArrayBuffer(bytes.subarray(SALT_LENGTH + IV_LENGTH))

    try {
      const key = await entryKey(dek, salt, 'decrypt')

      return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherText))
    } catch (err) {
      if (dek !== '') {
        throw err
      }

      const key = await crypto.subtle.importKey('jwk', PRECOMPUTED_EMPTY_PASSWORD_KEY, 'AES-GCM', false, ['decrypt'])

      return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherText))
    }
  } catch (err: any) {
    throw new DecryptionFailedError(`Could not decrypt key - ${err.message}`)
  }
}
