'use strict'

const crypto = require('crypto')

const lengths = require('./hmac-lengths')

exports.create = function (hash, secret, callback) {
  const res = {
    digest (data, cb) {
      const hmac = genFresh()
      hmac.update(data)

      setImmediate(() => {
        cb(null, hmac.digest())
      })
    },
    length: lengths[hash]
  }

  function genFresh () {
    return crypto.createHmac(hash.toLowerCase(), secret)
  }
  callback(null, res)
}
