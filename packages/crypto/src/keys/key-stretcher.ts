import { InvalidParametersError } from '@libp2p/interface'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as hmac from '../hmac/index.js'
import type { EnhancedKey, EnhancedKeyPair } from './interface.js'

interface Cipher {
  ivSize: number
  keySize: number
}

const cipherMap: Record<string, Cipher> = {
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
    keySize: 32
  }
}

/**
 * Generates a set of keys for each party by stretching the shared key.
 * (myIV, theirIV, myCipherKey, theirCipherKey, myMACKey, theirMACKey)
 */
export async function keyStretcher (cipherType: 'AES-128' | 'AES-256' | 'Blowfish', hash: 'SHA1' | 'SHA256' | 'SHA512', secret: Uint8Array): Promise<EnhancedKeyPair> {
  if (cipherType !== 'AES-128' && cipherType !== 'AES-256' && cipherType !== 'Blowfish') {
    throw new InvalidParametersError('Cipher type was missing or unsupported')
  }

  if (hash !== 'SHA1' && hash !== 'SHA256' && hash !== 'SHA512') {
    throw new InvalidParametersError('Hash type was missing or unsupported')
  }

  if (secret == null || !(secret instanceof Uint8Array)) {
    throw new InvalidParametersError('Secret was missing or an incorrect type')
  }

  const cipher = cipherMap[cipherType]
  const cipherKeySize = cipher.keySize
  const ivSize = cipher.ivSize
  const hmacKeySize = 20
  const seed = uint8ArrayFromString('key expansion')
  const resultLength = 2 * (ivSize + cipherKeySize + hmacKeySize)

  const m = await hmac.create(hash, secret)
  let a = await m.digest(seed)

  const result = []
  let j = 0

  while (j < resultLength) {
    const b = await m.digest(uint8ArrayConcat([a, seed]))
    let todo = b.length

    if (j + todo > resultLength) {
      todo = resultLength - j
    }

    result.push(b)
    j += todo
    a = await m.digest(a)
  }

  const half = resultLength / 2
  const resultBuffer = uint8ArrayConcat(result)
  const r1 = resultBuffer.subarray(0, half)
  const r2 = resultBuffer.subarray(half, resultLength)

  const createKey = (res: Uint8Array): EnhancedKey => ({
    iv: res.subarray(0, ivSize),
    cipherKey: res.subarray(ivSize, ivSize + cipherKeySize),
    macKey: res.subarray(ivSize + cipherKeySize)
  })

  return {
    k1: createKey(r1),
    k2: createKey(r2)
  }
}
