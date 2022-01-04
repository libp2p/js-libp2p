import * as ciphers from './ciphers.js'
import { cipherMode } from './cipher-mode.js'

export interface AESCipher {
  encrypt: (data: Uint8Array) => Promise<Uint8Array>
  decrypt: (data: Uint8Array) => Promise<Uint8Array>
}

export async function create (key: Uint8Array, iv: Uint8Array) { // eslint-disable-line require-await
  const mode = cipherMode(key)
  const cipher = ciphers.createCipheriv(mode, key, iv)
  const decipher = ciphers.createDecipheriv(mode, key, iv)

  const res: AESCipher = {
    async encrypt (data) { // eslint-disable-line require-await
      return cipher.update(data)
    },

    async decrypt (data) { // eslint-disable-line require-await
      return decipher.update(data)
    }
  }

  return res
}
