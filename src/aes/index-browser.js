'use strict'

const asm = require('asmcrypto.js')
const nextTick = require('async/nextTick')

exports.create = function (key, iv, callback) {
  const done = (err, res) => nextTick(() => callback(err, res))

  if (key.length !== 16 && key.length !== 32) {
    return done(new Error('Invalid key length'))
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
    encrypt (data, cb) {
      const done = (err, res) => nextTick(() => cb(err, res))

      let res
      try {
        res = Buffer.from(
          enc.process(data).result
        )
      } catch (err) {
        return done(err)
      }

      done(null, res)
    },

    decrypt (data, cb) {
      const done = (err, res) => nextTick(() => cb(err, res))

      let res
      try {
        res = Buffer.from(
          dec.process(data).result
        )
      } catch (err) {
        return done(err)
      }

      done(null, res)
    }
  }

  done(null, res)
}
