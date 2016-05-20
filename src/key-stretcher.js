'use strict'

const forge = require('node-forge')
const createBuffer = forge.util.createBuffer

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

const hashMap = {
  SHA1: 'sha1',
  SHA256: 'sha256',
  // workaround for https://github.com/digitalbazaar/forge/issues/401
  SHA512: forge.md.sha512.create()
}

// Generates a set of keys for each party by stretching the shared key.
// (myIV, theirIV, myCipherKey, theirCipherKey, myMACKey, theirMACKey)
module.exports = (cipherType, hashType, secret) => {
  const cipher = cipherMap[cipherType]
  const hash = hashMap[hashType]

  if (!cipher) {
    throw new Error('unkown cipherType passed')
  }

  if (!hash) {
    throw new Error('unkown hashType passed')
  }

  if (Buffer.isBuffer(secret)) {
    secret = createBuffer(secret.toString('binary'))
  }

  const cipherKeySize = cipher.keySize
  const ivSize = cipher.ivSize
  const hmacKeySize = 20
  const seed = 'key expansion'
  const resultLength = 2 * (ivSize + cipherKeySize + hmacKeySize)

  const m = forge.hmac.create()
  m.start(hash, secret)
  m.update(seed)

  let a = m.digest().bytes()
  const result = createBuffer()

  let j = 0
  for (; j < resultLength;) {
    m.start(hash, secret)
    m.update(a)
    m.update(seed)

    const b = createBuffer(m.digest(), 'raw')
    let todo = b.length()

    if (j + todo > resultLength) {
      todo = resultLength - j
    }

    result.putBytes(b.getBytes(todo))

    j += todo

    m.start(hash, secret)
    m.update(a)
    a = m.digest().bytes()
  }

  const half = resultLength / 2
  const r1 = createBuffer(result.getBytes(half))
  const r2 = createBuffer(result.getBytes())

  const createKey = (res) => ({
    iv: new Buffer(res.getBytes(ivSize), 'binary'),
    cipherKey: new Buffer(res.getBytes(cipherKeySize), 'binary'),
    macKey: new Buffer(res.getBytes(), 'binary')
  })

  return {
    k1: createKey(r1),
    k2: createKey(r2)
  }
}
