'use strict'

const webcrypto = require('../webcrypto.js')()
const nodeify = require('../nodeify')
const BN = require('asn1.js').bignum

const util = require('../util')
const toBase64 = util.toBase64
const toBn = util.toBn

const bits = {
  'P-256': 256,
  'P-384': 384,
  'P-521': 521
}

exports.generateEphmeralKeyPair = function (curve, callback) {
  nodeify(webcrypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: curve
    },
    true,
    ['deriveBits']
  ).then((pair) => {
    // forcePrivate is used for testing only
    const genSharedKey = (theirPub, forcePrivate, cb) => {
      if (typeof forcePrivate === 'function') {
        cb = forcePrivate
        forcePrivate = undefined
      }

      let privateKey

      if (forcePrivate) {
        privateKey = webcrypto.subtle.importKey(
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
        privateKey = Promise.resolve(pair.privateKey)
      }

      const keys = Promise.all([
        webcrypto.subtle.importKey(
          'jwk',
          unmarshalPublicKey(curve, theirPub),
          {
            name: 'ECDH',
            namedCurve: curve
          },
          false,
          []
        ),
        privateKey
      ])

      nodeify(keys.then((keys) => webcrypto.subtle.deriveBits(
        {
          name: 'ECDH',
          namedCurve: curve,
          public: keys[0]
        },
        keys[1],
        bits[curve]
      )).then((bits) => Buffer.from(bits)), cb)
    }

    return webcrypto.subtle.exportKey('jwk', pair.publicKey)
      .then((publicKey) => {
        return {
          key: marshalPublicKey(publicKey),
          genSharedKey
        }
      })
  }), callback)
}

const curveLengths = {
  'P-256': 32,
  'P-384': 48,
  'P-521': 66
}

// Marshal converts a jwk encodec ECDH public key into the
// form specified in section 4.3.6 of ANSI X9.62. (This is the format
// go-ipfs uses)
function marshalPublicKey (jwk) {
  const byteLen = curveLengths[jwk.crv]

  return Buffer.concat([
    Buffer.from([4]), // uncompressed point
    toBn(jwk.x).toArrayLike(Buffer, 'be', byteLen),
    toBn(jwk.y).toArrayLike(Buffer, 'be', byteLen)
  ], 1 + byteLen * 2)
}

// Unmarshal converts a point, serialized by Marshal, into an jwk encoded key
function unmarshalPublicKey (curve, key) {
  const byteLen = curveLengths[curve]

  if (!key.slice(0, 1).equals(Buffer.from([4]))) {
    throw new Error('Invalid key format')
  }
  const x = new BN(key.slice(1, byteLen + 1))
  const y = new BN(key.slice(1 + byteLen))

  return {
    kty: 'EC',
    crv: curve,
    x: toBase64(x, byteLen),
    y: toBase64(y, byteLen),
    ext: true
  }
}

function unmarshalPrivateKey (curve, key) {
  const result = unmarshalPublicKey(curve, key.public)
  result.d = toBase64(new BN(key.private))
  return result
}
