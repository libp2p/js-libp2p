'use strict'
const { Buffer } = require('buffer')
require('node-forge/lib/aes')
const forge = require('node-forge/lib/forge')

module.exports = {
  createCipheriv: (mode, key, iv) => {
    const cipher2 = forge.cipher.createCipher('AES-CTR', key.toString('binary'))
    cipher2.start({ iv: iv.toString('binary') })
    return {
      update: (data) => {
        cipher2.update(forge.util.createBuffer(data.toString('binary')))
        return Buffer.from(cipher2.output.getBytes(), 'binary')
      }
    }
  },
  createDecipheriv: (mode, key, iv) => {
    const cipher2 = forge.cipher.createDecipher('AES-CTR', key.toString('binary'))
    cipher2.start({ iv: iv.toString('binary') })
    return {
      update: (data) => {
        cipher2.update(forge.util.createBuffer(data.toString('binary')))
        return Buffer.from(cipher2.output.getBytes(), 'binary')
      }
    }
  }
}
