import { CodeError } from '@libp2p/interfaces/errors'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { base64urlToBuffer } from '../util.js'
import webcrypto from '../webcrypto.js'
import type { ECDHKey, ECDHKeyPair, JWKEncodedPrivateKey, JWKEncodedPublicKey } from './interface.js'

const bits = {
  'P-256': 256,
  'P-384': 384,
  'P-521': 521
}

const curveTypes = Object.keys(bits)
const names = curveTypes.join(' / ')

export async function generateEphmeralKeyPair (curve: string): Promise<ECDHKey> {
  if (curve !== 'P-256' && curve !== 'P-384' && curve !== 'P-521') {
    throw new CodeError(`Unknown curve: ${curve}. Must be ${names}`, 'ERR_INVALID_CURVE')
  }

  const pair = await webcrypto.get().subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: curve
    },
    true,
    ['deriveBits']
  )

  // forcePrivate is used for testing only
  const genSharedKey = async (theirPub: Uint8Array, forcePrivate?: ECDHKeyPair): Promise<Uint8Array> => {
    let privateKey

    if (forcePrivate != null) {
      privateKey = await webcrypto.get().subtle.importKey(
        'jwk',
        unmarshalPrivateKey(curve, forcePrivate),
        {
          name: 'ECDH',
          namedCurve: curve
        },
        false,
        ['deriveBits']
      )
    } else {
      privateKey = pair.privateKey
    }

    const key = await webcrypto.get().subtle.importKey(
      'jwk',
      unmarshalPublicKey(curve, theirPub),
      {
        name: 'ECDH',
        namedCurve: curve
      },
      false,
      []
    )

    const buffer = await webcrypto.get().subtle.deriveBits(
      {
        name: 'ECDH',
        // @ts-expect-error namedCurve is missing from the types
        namedCurve: curve,
        public: key
      },
      privateKey,
      bits[curve]
    )

    return new Uint8Array(buffer, 0, buffer.byteLength)
  }

  const publicKey = await webcrypto.get().subtle.exportKey('jwk', pair.publicKey)

  const ecdhKey: ECDHKey = {
    key: marshalPublicKey(publicKey),
    genSharedKey
  }

  return ecdhKey
}

const curveLengths = {
  'P-256': 32,
  'P-384': 48,
  'P-521': 66
}

// Marshal converts a jwk encoded ECDH public key into the
// form specified in section 4.3.6 of ANSI X9.62. (This is the format
// go-ipfs uses)
function marshalPublicKey (jwk: JsonWebKey): Uint8Array {
  if (jwk.crv == null || jwk.x == null || jwk.y == null) {
    throw new CodeError('JWK was missing components', 'ERR_INVALID_PARAMETERS')
  }

  if (jwk.crv !== 'P-256' && jwk.crv !== 'P-384' && jwk.crv !== 'P-521') {
    throw new CodeError(`Unknown curve: ${jwk.crv}. Must be ${names}`, 'ERR_INVALID_CURVE')
  }

  const byteLen = curveLengths[jwk.crv]

  return uint8ArrayConcat([
    Uint8Array.from([4]), // uncompressed point
    base64urlToBuffer(jwk.x, byteLen),
    base64urlToBuffer(jwk.y, byteLen)
  ], 1 + byteLen * 2)
}

// Unmarshal converts a point, serialized by Marshal, into an jwk encoded key
function unmarshalPublicKey (curve: string, key: Uint8Array): JWKEncodedPublicKey {
  if (curve !== 'P-256' && curve !== 'P-384' && curve !== 'P-521') {
    throw new CodeError(`Unknown curve: ${curve}. Must be ${names}`, 'ERR_INVALID_CURVE')
  }

  const byteLen = curveLengths[curve]

  if (!uint8ArrayEquals(key.subarray(0, 1), Uint8Array.from([4]))) {
    throw new CodeError('Cannot unmarshal public key - invalid key format', 'ERR_INVALID_KEY_FORMAT')
  }

  return {
    kty: 'EC',
    crv: curve,
    x: uint8ArrayToString(key.subarray(1, byteLen + 1), 'base64url'),
    y: uint8ArrayToString(key.subarray(1 + byteLen), 'base64url'),
    ext: true
  }
}

const unmarshalPrivateKey = (curve: string, key: ECDHKeyPair): JWKEncodedPrivateKey => ({
  ...unmarshalPublicKey(curve, key.public),
  d: uint8ArrayToString(key.private, 'base64url')
})
