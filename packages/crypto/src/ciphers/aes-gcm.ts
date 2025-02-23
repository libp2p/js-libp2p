import crypto from 'crypto'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { CreateOptions, AESCipher } from './interface.js'

// Based off of code from https://github.com/luke-park/SecureCompatibleEncryptionExamples

export function create (opts?: CreateOptions): AESCipher {
  const algorithm = opts?.algorithm ?? 'aes-128-gcm'
  const keyLength = opts?.keyLength ?? 16
  const nonceLength = opts?.nonceLength ?? 12
  const digest = opts?.digest ?? 'sha256'
  const saltLength = opts?.saltLength ?? 16
  const iterations = opts?.iterations ?? 32767
  const algorithmTagLength = opts?.algorithmTagLength ?? 16

  function encryptWithKey (data: Uint8Array, key: Uint8Array): Uint8Array {
    const nonce = crypto.randomBytes(nonceLength)

    // Create the cipher instance.
    const cipher = crypto.createCipheriv(algorithm, key, nonce)

    // Encrypt and prepend nonce.
    const ciphertext = uint8ArrayConcat([cipher.update(data), cipher.final()])

    // @ts-expect-error getAuthTag is not a function
    return uint8ArrayConcat([nonce, ciphertext, cipher.getAuthTag()])
  }

  /**
   * Uses the provided password to derive a pbkdf2 key. The key
   * will then be used to encrypt the data.
   */
  async function encrypt (data: Uint8Array, password: string | Uint8Array): Promise<Uint8Array> {
    // Generate a 128-bit salt
    const salt = crypto.randomBytes(saltLength)

    if (typeof password === 'string') {
      password = uint8ArrayFromString(password)
    }

    // Derive a key using PBKDF2.
    const key = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest)

    // Encrypt and prepend salt.
    return uint8ArrayConcat([salt, encryptWithKey(Uint8Array.from(data), key)])
  }

  /**
   * Decrypts the given cipher text with the provided key. The `key` should
   * be a cryptographically safe key and not a plaintext password. To use
   * a plaintext password, use `decrypt`. The options used to create
   * this decryption cipher must be the same as those used to create
   * the encryption cipher.
   */
  function decryptWithKey (ciphertextAndNonce: Uint8Array, key: Uint8Array): Uint8Array {
    // Create Uint8Arrays of nonce, ciphertext and tag.
    const nonce = ciphertextAndNonce.subarray(0, nonceLength)
    const ciphertext = ciphertextAndNonce.subarray(nonceLength, ciphertextAndNonce.length - algorithmTagLength)
    const tag = ciphertextAndNonce.subarray(ciphertext.length + nonceLength)

    // Create the cipher instance.
    const cipher = crypto.createDecipheriv(algorithm, key, nonce)

    // Decrypt and return result.
    // @ts-expect-error getAuthTag is not a function
    cipher.setAuthTag(tag)
    return uint8ArrayConcat([cipher.update(ciphertext), cipher.final()])
  }

  /**
   * Uses the provided password to derive a pbkdf2 key. The key
   * will then be used to decrypt the data. The options used to create
   * this decryption cipher must be the same as those used to create
   * the encryption cipher.
   *
   * @param {Uint8Array} data - The data to decrypt
   * @param {string|Uint8Array} password - A plain password
   */
  async function decrypt (data: Uint8Array, password: string | Uint8Array): Promise<Uint8Array> {
    // Create Uint8Arrays of salt and ciphertextAndNonce.
    const salt = data.subarray(0, saltLength)
    const ciphertextAndNonce = data.subarray(saltLength)

    if (typeof password === 'string') {
      password = uint8ArrayFromString(password)
    }

    // Derive the key using PBKDF2.
    const key = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest)

    // Decrypt and return result.
    return decryptWithKey(ciphertextAndNonce, key)
  }

  const cipher: AESCipher = {
    encrypt,
    decrypt
  }

  return cipher
}
