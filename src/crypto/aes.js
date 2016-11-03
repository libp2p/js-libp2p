'use strict'

const crypto = require('crypto')

const ciphers = {
  16: 'aes-128-ctr',
  32: 'aes-256-ctr'
}

exports.create = function (key, iv, callback) {
  const name = ciphers[key.length]
  if (!name) {
    return callback(new Error('Invalid key length'))
  }

  const cipher = crypto.createCipheriv(name, key, iv)
  const decipher = crypto.createDecipheriv(name, key, iv)

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
