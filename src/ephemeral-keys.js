'use strict'

const EC = require('elliptic').ec

const curveMap = {
  'P-256': 'p256',
  'P-384': 'p384',
  'P-521': 'p521'
}

// Generates an ephemeral public key and returns a function that will compute
// the shared secret key.
//
// Focuses only on ECDH now, but can be made more general in the future.
module.exports = (curveName) => {
  const curve = curveMap[curveName]
  if (!curve) {
    throw new Error('unsupported curve passed')
  }

  const ec = new EC(curve)

  const priv = ec.genKeyPair()

  // forcePrivate is used for testing only
  const genSharedKey = (theirPub, forcePrivate) => {
    const pub = ec.keyFromPublic(theirPub, 'hex')
    const p = forcePrivate || priv
    return p.derive(pub.getPublic()).toBuffer('be')
  }

  return {
    key: new Buffer(priv.getPublic('hex'), 'hex'),
    genSharedKey
  }
}
