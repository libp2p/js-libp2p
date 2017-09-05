'use strict'

const nodeify = require('../nodeify')

const crypto = require('../webcrypto.js')()
const lengths = require('./lengths')

const hashTypes = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512'
}

const sign = (key, data, cb) => {
  nodeify(crypto.subtle.sign({name: 'HMAC'}, key, data)
    .then((raw) => Buffer.from(raw)), cb)
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
        sign(key, data, cb)
      },
      length: lengths[hashType]
    }
  }), callback)
}
