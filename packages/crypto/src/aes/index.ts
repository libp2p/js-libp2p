import { cipherMode } from './cipher-mode.js'
import * as ciphers from './ciphers.js'

export interface AESCipher {
  encrypt: (data: Uint8Array) => Promise<Uint8Array>
  decrypt: (data: Uint8Array) => Promise<Uint8Array>
}

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
