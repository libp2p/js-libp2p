'use strict'

const uint8ArrayFromString = require('uint8arrays/from-string')

module.exports = {
  // protobuf marshaled key pair generated with libp2p-crypto-secp256k1
  // and marshaled with libp2p-crypto.marshalPublicKey / marshalPrivateKey
  pbmPrivateKey: uint8ArrayFromString('08021220e0600103010000000100000000000000be1dc82c2e000000e8d6030301000000', 'base16'),
  pbmPublicKey: uint8ArrayFromString('0802122103a9a7272a726fa083abf31ba44037f8347fbc5e5d3113d62a7c6bc26752fd8ee1', 'base16')
}
