'use strict'

const ecdh = require('./ecdh')

// Generates an ephemeral public key and returns a function that will compute
// the shared secret key.
//
// Focuses only on ECDH now, but can be made more general in the future.
module.exports = async (curve) => ecdh.generateEphmeralKeyPair(curve) // eslint-disable-line require-await
