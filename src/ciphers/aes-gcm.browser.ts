import { concat } from 'uint8arrays/concat'
import { fromString } from 'uint8arrays/from-string'
import webcrypto from '../webcrypto.js'
import type { CreateOptions, AESCipher } from './interface.js'

// Based off of code from https://github.com/luke-park/SecureCompatibleEncryptionExamples

export function create (opts?: CreateOptions) {
  const algorithm = opts?.algorithm ?? 'AES-GCM'
  let keyLength = opts?.keyLength ?? 16
  const nonceLength = opts?.nonceLength ?? 12
  const digest = opts?.digest ?? 'SHA-256'
  const saltLength = opts?.saltLength ?? 16
  const iterations = opts?.iterations ?? 32767

  const crypto = webcrypto.get()
  keyLength *= 8 // Browser crypto uses bits instead of bytes

  /**
   * Uses the provided password to derive a pbkdf2 key. The key
   * will then be used to encrypt the data.
   */
  async function encrypt (data: Uint8Array, password: string | Uint8Array) { // eslint-disable-line require-await
    const salt = crypto.getRandomValues(new Uint8Array(saltLength))
    const nonce = crypto.getRandomValues(new Uint8Array(nonceLength))
    const aesGcm = { name: algorithm, iv: nonce }

    if (typeof password === 'string') {
      password = fromString(password)
    }

    // Derive a key using PBKDF2.
    const deriveParams = { name: 'PBKDF2', salt, iterations, hash: { name: digest } }
    const rawKey = await crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, ['deriveKey', 'deriveBits'])
    const cryptoKey = await crypto.subtle.deriveKey(deriveParams, rawKey, { name: algorithm, length: keyLength }, true, ['encrypt'])

    // Encrypt the string.
    const ciphertext = await crypto.subtle.encrypt(aesGcm, cryptoKey, data)
    return concat([salt, aesGcm.iv, new Uint8Array(ciphertext)])
  }

  /**
   * Uses the provided password to derive a pbkdf2 key. The key
   * will then be used to decrypt the data. The options used to create
   * this decryption cipher must be the same as those used to create
   * the encryption cipher.
   */
  async function decrypt (data: Uint8Array, password: string | Uint8Array) {
    const salt = data.subarray(0, saltLength)
    const nonce = data.subarray(saltLength, saltLength + nonceLength)
    const ciphertext = data.subarray(saltLength + nonceLength)
    const aesGcm = { name: algorithm, iv: nonce }

    if (typeof password === 'string') {
      password = fromString(password)
    }

    // Derive the key using PBKDF2.
    const deriveParams = { name: 'PBKDF2', salt, iterations, hash: { name: digest } }
    const rawKey = await crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, ['deriveKey', 'deriveBits'])
    const cryptoKey = await crypto.subtle.deriveKey(deriveParams, rawKey, { name: algorithm, length: keyLength }, true, ['decrypt'])

    // Decrypt the string.
    const plaintext = await crypto.subtle.decrypt(aesGcm, cryptoKey, ciphertext)
    return new Uint8Array(plaintext)
  }

  const cipher: AESCipher = {
    encrypt,
    decrypt
  }

  return cipher
}
