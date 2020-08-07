'use strict'

require('node-forge/lib/aes')
const forge = require('node-forge/lib/forge')
const uint8ArrayToString = require('uint8arrays/to-string')
const uint8ArrayFromString = require('uint8arrays/from-string')

module.exports = {
  createCipheriv: (mode, key, iv) => {
    const cipher2 = forge.cipher.createCipher('AES-CTR', uint8ArrayToString(key, 'ascii'))
    cipher2.start({ iv: uint8ArrayToString(iv, 'ascii') })
    return {
      update: (data) => {
        cipher2.update(forge.util.createBuffer(uint8ArrayToString(data, 'ascii')))
        return uint8ArrayFromString(cipher2.output.getBytes(), 'ascii')
      }
    }
  },
  createDecipheriv: (mode, key, iv) => {
    const cipher2 = forge.cipher.createDecipher('AES-CTR', uint8ArrayToString(key, 'ascii'))
    cipher2.start({ iv: uint8ArrayToString(iv, 'ascii') })
    return {
      update: (data) => {
        cipher2.update(forge.util.createBuffer(uint8ArrayToString(data, 'ascii')))
        return uint8ArrayFromString(cipher2.output.getBytes(), 'ascii')
      }
    }
  }
}
