'use strict'

module.exports = {
  rsa: require('./rsa-class'),
  ed25519: require('./ed25519-class'),
  secp256k1: require('libp2p-crypto-secp256k1')
}
