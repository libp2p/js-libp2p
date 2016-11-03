'use strict'

const nodeify = require('nodeify')

const crypto = require('./webcrypto')()

exports.create = function (key, iv, callback) {
  nodeify(crypto.subtle.importKey(
    'raw',
    key,
    {
      name: 'AES-CTR'
    },
    false,
    ['encrypt', 'decrypt']
  ).then((key) => {
    const counter = copy(iv)

    return {
      encrypt (data, cb) {
        nodeify(crypto.subtle.encrypt(
          {
            name: 'AES-CTR',
            counter: counter,
            length: 128
          },
          key,
          data
        ).then((raw) => Buffer.from(raw)), cb)
      },

      decrypt (data, cb) {
        nodeify(crypto.subtle.decrypt(
          {
            name: 'AES-CTR',
            counter: counter,
            length: 128
          },
          key,
          data
        ).then((raw) => Buffer.from(raw)), cb)
      }
    }
  }), callback)
}

function copy (buf) {
  const fresh = new Buffer(buf.length)
  buf.copy(fresh)

  return fresh
}
