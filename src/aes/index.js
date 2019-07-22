'use strict'

const ciphers = require('./ciphers')
const cipherMode = require('./cipher-mode')

exports.create = async function (key, iv) { // eslint-disable-line require-await
  const mode = cipherMode(key)
  const cipher = ciphers.createCipheriv(mode, key, iv)
  const decipher = ciphers.createDecipheriv(mode, key, iv)

  const res = {
    async encrypt (data) { // eslint-disable-line require-await
      return cipher.update(data)
    },

    async decrypt (data) { // eslint-disable-line require-await
      return decipher.update(data)
    }
  }

  return res
}
