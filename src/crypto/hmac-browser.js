'use strict'

const nodeify = require('nodeify')

const crypto = require('./webcrypto')()
const lengths = require('./hmac-lengths')

const hashTypes = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512'
}

exports.create = function (hashType, secret, callback) {
  const hash = hashTypes[hashType]

  nodeify(crypto.subtle.importKey(
    'raw',
    secret,
    {
      name: 'HMAC',
      hash: {name: hash}
    },
    false,
    ['sign']
  ).then((key) => {
    return {
      digest (data, cb) {
        nodeify(crypto.subtle.sign(
          {name: 'HMAC'},
          key,
          data
        ).then((raw) => Buffer.from(raw)), cb)
      },
      length: lengths[hashType]
    }
  }), callback)
}
