
import 'node-forge/lib/aes.js'
// @ts-expect-error types are missing
import forge from 'node-forge/lib/forge.js'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

export interface Cipher {
  update: (data: Uint8Array) => Uint8Array
}

export function createCipheriv (mode: any, key: Uint8Array, iv: Uint8Array): Cipher {
  const cipher2 = forge.cipher.createCipher('AES-CTR', uint8ArrayToString(key, 'ascii'))
  cipher2.start({ iv: uint8ArrayToString(iv, 'ascii') })
  return {
    update: (data: Uint8Array) => {
      cipher2.update(forge.util.createBuffer(uint8ArrayToString(data, 'ascii')))
      return uint8ArrayFromString(cipher2.output.getBytes(), 'ascii')
    }
  }
}

export function createDecipheriv (mode: any, key: Uint8Array, iv: Uint8Array): Cipher {
  const cipher2 = forge.cipher.createDecipher('AES-CTR', uint8ArrayToString(key, 'ascii'))
  cipher2.start({ iv: uint8ArrayToString(iv, 'ascii') })
  return {
    update: (data: Uint8Array) => {
      cipher2.update(forge.util.createBuffer(uint8ArrayToString(data, 'ascii')))
      return uint8ArrayFromString(cipher2.output.getBytes(), 'ascii')
    }
  }
}
