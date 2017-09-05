'use strict'

const whilst = require('async/whilst')
const hmac = require('../hmac')

const cipherMap = {
  'AES-128': {
    ivSize: 16,
    keySize: 16
  },
  'AES-256': {
    ivSize: 16,
    keySize: 32
  },
  Blowfish: {
    ivSize: 8,
    cipherKeySize: 32
  }
}

// Generates a set of keys for each party by stretching the shared key.
// (myIV, theirIV, myCipherKey, theirCipherKey, myMACKey, theirMACKey)
module.exports = (cipherType, hash, secret, callback) => {
  const cipher = cipherMap[cipherType]

  if (!cipher) {
    return callback(new Error('unkown cipherType passed'))
  }

  if (!hash) {
    return callback(new Error('unkown hashType passed'))
  }

  const cipherKeySize = cipher.keySize
  const ivSize = cipher.ivSize
  const hmacKeySize = 20
  const seed = Buffer.from('key expansion')
  const resultLength = 2 * (ivSize + cipherKeySize + hmacKeySize)

  hmac.create(hash, secret, (err, m) => {
    if (err) {
      return callback(err)
    }

    m.digest(seed, (err, a) => {
      if (err) {
        return callback(err)
      }

      let result = []
      let j = 0

      whilst(
        () => j < resultLength,
        stretch,
        finish
      )

      function stretch (cb) {
        m.digest(Buffer.concat([a, seed]), (err, b) => {
          if (err) {
            return cb(err)
          }

          let todo = b.length

          if (j + todo > resultLength) {
            todo = resultLength - j
          }

          result.push(b)

          j += todo

          m.digest(a, (err, _a) => {
            if (err) {
              return cb(err)
            }
            a = _a
            cb()
          })
        })
      }

      function finish (err) {
        if (err) {
          return callback(err)
        }

        const half = resultLength / 2
        const resultBuffer = Buffer.concat(result)
        const r1 = resultBuffer.slice(0, half)
        const r2 = resultBuffer.slice(half, resultLength)

        const createKey = (res) => ({
          iv: res.slice(0, ivSize),
          cipherKey: res.slice(ivSize, ivSize + cipherKeySize),
          macKey: res.slice(ivSize + cipherKeySize)
        })

        callback(null, {
          k1: createKey(r1),
          k2: createKey(r2)
        })
      }
    })
  })
}
