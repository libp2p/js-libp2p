import { InvalidParametersError } from '@libp2p/interface'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { base64urlToBuffer } from '../../util.js'
import webcrypto from '../../webcrypto/index.js'
import type { Curve } from './index.js'
import type { ECDHKey, ECDHKeyPair, JWKEncodedPrivateKey, JWKEncodedPublicKey } from '../interface.js'

const curveLengths = {
  'P-256': 32,
  'P-384': 48,
  'P-521': 66
}

const curveTypes = Object.keys(curveLengths)
const names = curveTypes.join(' / ')

export async function generateEphemeralKeyPair (curve: Curve): Promise<ECDHKey> {
  if (curve !== 'P-256' && curve !== 'P-384' && curve !== 'P-521') {
    throw new InvalidParametersError(`Unknown curve: ${curve}. Must be ${names}`)
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
        public: key
      },
      privateKey,
      curveLengths[curve] * 8
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

// Marshal converts a jwk encoded ECDH public key into the
// form specified in section 4.3.6 of ANSI X9.62. (This is the format
// go-ipfs uses)
function marshalPublicKey (jwk: JsonWebKey): Uint8Array {
  if (jwk.crv == null || jwk.x == null || jwk.y == null) {
    throw new InvalidParametersError('JWK was missing components')
  }

  if (jwk.crv !== 'P-256' && jwk.crv !== 'P-384' && jwk.crv !== 'P-521') {
    throw new InvalidParametersError(`Unknown curve: ${jwk.crv}. Must be ${names}`)
  }

  const byteLen = curveLengths[jwk.crv]

  return uint8ArrayConcat([
    Uint8Array.from([4]), // uncompressed point
    base64urlToBuffer(jwk.x, byteLen),
    base64urlToBuffer(jwk.y, byteLen)
  ], 1 + byteLen * 2)
}

/**
 * Unmarshal converts a point, serialized by Marshal, into an jwk encoded key
 */
function unmarshalPublicKey (curve: Curve, key: Uint8Array): JWKEncodedPublicKey {
  if (curve !== 'P-256' && curve !== 'P-384' && curve !== 'P-521') {
    throw new InvalidParametersError(`Unknown curve: ${curve}. Must be ${names}`)
  }

  const byteLen = curveLengths[curve]

  if (!uint8ArrayEquals(key.subarray(0, 1), Uint8Array.from([4]))) {
    throw new InvalidParametersError('Cannot unmarshal public key - invalid key format')
  }

  return {
    kty: 'EC',
    crv: curve,
    x: uint8ArrayToString(key.subarray(1, byteLen + 1), 'base64url'),
    y: uint8ArrayToString(key.subarray(1 + byteLen), 'base64url'),
    ext: true
  }
}

const unmarshalPrivateKey = (curve: Curve, key: ECDHKeyPair): JWKEncodedPrivateKey => ({
  ...unmarshalPublicKey(curve, key.public),
  d: uint8ArrayToString(key.private, 'base64url')
})
