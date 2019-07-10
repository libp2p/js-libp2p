'use strict'

const asm = require('asmcrypto.js')

exports.create = async function (key, iv) { // eslint-disable-line require-await
  if (key.length !== 16 && key.length !== 32) {
    throw new Error('Invalid key length')
  }

  const enc = new asm.AES_CTR.Encrypt({
    key: key,
    nonce: iv
  })
  const dec = new asm.AES_CTR.Decrypt({
    key: key,
    nonce: iv
  })

  const res = {
    async encrypt (data) { // eslint-disable-line require-await
      return Buffer.from(
        enc.process(data).result
      )
    },

    async decrypt (data) { // eslint-disable-line require-await
      return Buffer.from(
        dec.process(data).result
      )
    }
  }

  return res
}
