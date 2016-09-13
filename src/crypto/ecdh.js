'use strict'

const crypto = require('./webcrypto')()
const nodeify = require('nodeify')

exports.generateEphmeralKeyPair = function (curve, callback) {
  nodeify(crypto.subtle.generateKey(
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

      const privateKey = forcePrivate || pair.privateKey
      nodeify(crypto.subtle.importKey(
        'spki',
        theirPub,
        {
          name: 'ECDH',
          namedCurve: curve
        },
        false,
        []
      ).then((publicKey) => {
        return crypto.subtle.deriveBits(
          {
            name: 'ECDH',
            namedCurve: curve,
            public: publicKey
          },
          privateKey,
          256
        )
      }).then((bits) => {
        // return p.derive(pub.getPublic()).toBuffer('be')
        return Buffer.from(bits)
      }), cb)
    }

    return crypto.subtle.exportKey(
      'spki',
      pair.publicKey
    ).then((publicKey) => {
      return {
        key: Buffer.from(publicKey),
        genSharedKey
      }
    })
  }), callback)
}
