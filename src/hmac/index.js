'use strict'

const crypto = require('crypto')
const lengths = require('./lengths')

exports.create = async function (hash, secret) { // eslint-disable-line require-await
  const res = {
    async digest (data) { // eslint-disable-line require-await
      const hmac = crypto.createHmac(hash.toLowerCase(), secret)
      hmac.update(data)
      return hmac.digest()
    },
    length: lengths[hash]
  }

  return res
}
