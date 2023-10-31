/**
 * @packageDocumentation
 *
 * Exposes an interface to AES encryption (formerly Rijndael), as defined in U.S. Federal Information Processing Standards Publication 197.
 *
 * This uses `CTR` mode.
 *
 * /**
 * @example
 *
 * ```js
 * import { create } from '@libp2p/crypto/aes'
 *
 * // Setting up Key and IV
 *
 * // A 16 bytes array, 128 Bits, AES-128 is chosen
 * const key128 = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
 *
 * // A 16 bytes array, 128 Bits,
 * const IV = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
 *
 * const decryptedMessage = 'Hello, world!'
 *
 * // Encrypting
 * const cipher = await crypto.aes.create(key128, IV)
 * const encryptedBuffer = await encrypt(Uint8Array.from(decryptedMessage))
 * console.log(encryptedBuffer)
 * // prints: <Uint8Array 42 f1 67 d9 2e 42 d0 32 9e b1 f8 3c>
 *
 * // Decrypting
 * const decipher = await crypto.aes.create(key128, IV)
 * const decryptedBuffer = await decrypt(encryptedBuffer)
 *
 * console.log(decryptedBuffer)
 * // prints: <Uint8Array 42 f1 67 d9 2e 42 d0 32 9e b1 f8 3c>
 *
 * console.log(decryptedBuffer.toString('utf-8'))
 * // prints: Hello, world!
 * ```
 */

import { cipherMode } from './cipher-mode.js'
import * as ciphers from './ciphers.js'

export interface AESCipher {
  encrypt(data: Uint8Array): Promise<Uint8Array>
  decrypt(data: Uint8Array): Promise<Uint8Array>
}

/**
 * @param key - The key, if length `16` then `AES 128` is used. For length `32`, `AES 256` is used
 * @param iv - Must have length `16`
 */
export async function create (key: Uint8Array, iv: Uint8Array): Promise<AESCipher> {
  const mode = cipherMode(key)
  const cipher = ciphers.createCipheriv(mode, key, iv)
  const decipher = ciphers.createDecipheriv(mode, key, iv)

  const res: AESCipher = {
    async encrypt (data) {
      return cipher.update(data)
    },

    async decrypt (data) {
      return decipher.update(data)
    }
  }

  return res
}
