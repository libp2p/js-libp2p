'use strict'

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
module.exports = async (cipherType, hash, secret) => {
  const cipher = cipherMap[cipherType]

  if (!cipher) {
    throw new Error('unkown cipherType passed')
  }

  if (!hash) {
    throw new Error('unkown hashType passed')
  }

  const cipherKeySize = cipher.keySize
  const ivSize = cipher.ivSize
  const hmacKeySize = 20
  const seed = Buffer.from('key expansion')
  const resultLength = 2 * (ivSize + cipherKeySize + hmacKeySize)

  const m = await hmac.create(hash, secret)
  let a = await m.digest(seed)

  let result = []
  let j = 0

  while (j < resultLength) {
    const b = await m.digest(Buffer.concat([a, seed]))
    let todo = b.length

    if (j + todo > resultLength) {
      todo = resultLength - j
    }

    result.push(b)
    j += todo
    a = await m.digest(a)
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

  return {
    k1: createKey(r1),
    k2: createKey(r2)
  }
}
