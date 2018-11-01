'use strict'

const crypto = require('crypto')
const lengths = require('./lengths')

exports.create = function (hash, secret, callback) {
  const res = {
    digest (data, cb) {
      const hmac = crypto.createHmac(hash.toLowerCase(), secret)

      hmac.update(data)

      cb(null, hmac.digest())
    },
    length: lengths[hash]
  }

  callback(null, res)
}
