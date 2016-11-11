'use strict'

const ciphers = require('./ciphers')

const CIPHER_MODES = {
  16: 'aes-128-ctr',
  32: 'aes-256-ctr'
}

exports.create = function (key, iv, callback) {
  const mode = CIPHER_MODES[key.length]
  if (!mode) {
    return callback(new Error('Invalid key length'))
  }

  const cipher = ciphers.createCipheriv(mode, key, iv)
  const decipher = ciphers.createDecipheriv(mode, key, iv)

  const res = {
    encrypt (data, cb) {
      cb(null, cipher.update(data))
    },

    decrypt (data, cb) {
      cb(null, decipher.update(data))
    }
  }

  callback(null, res)
}
