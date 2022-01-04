import webcrypto from '../webcrypto.js'
import lengths from './lengths.js'

const hashTypes = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA512: 'SHA-512'
}

const sign = async (key: CryptoKey, data: Uint8Array) => {
  const buf = await webcrypto.get().subtle.sign({ name: 'HMAC' }, key, data)
  return new Uint8Array(buf, 0, buf.byteLength)
}

export async function create (hashType: 'SHA1' | 'SHA256' | 'SHA512', secret: Uint8Array) {
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
    async digest (data: Uint8Array) { // eslint-disable-line require-await
      return await sign(key, data)
    },
    length: lengths[hashType]
  }
}
