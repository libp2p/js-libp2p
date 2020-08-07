'use strict'

const webcrypto = require('../webcrypto')
const lengths = require('./lengths')

const hashTypes = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512'
}

const sign = async (key, data) => {
  const buf = await webcrypto.get().subtle.sign({ name: 'HMAC' }, key, data)
  return new Uint8Array(buf, buf.byteOffset, buf.byteLength)
}

exports.create = async function (hashType, secret) {
  const hash = hashTypes[hashType]

  const key = await webcrypto.get().subtle.importKey(
    'raw',
    secret,
    {
      name: 'HMAC',
      hash: { name: hash }
    },
    false,
    ['sign']
  )

  return {
    async digest (data) { // eslint-disable-line require-await
      return sign(key, data)
    },
    length: lengths[hashType]
  }
}
