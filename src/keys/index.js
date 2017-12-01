'use strict'

const protobuf = require('protons')
const keysPBM = protobuf(require('./keys.proto'))

exports = module.exports

const supportedKeys = {
  rsa: require('./rsa-class'),
  ed25519: require('./ed25519-class'),
  secp256k1: require('libp2p-crypto-secp256k1')(keysPBM, require('../random-bytes'))
}

exports.supportedKeys = supportedKeys
exports.keysPBM = keysPBM

function isValidKeyType (keyType) {
  const key = supportedKeys[keyType.toLowerCase()]
  return key !== undefined
}

exports.keyStretcher = require('./key-stretcher')
exports.generateEphemeralKeyPair = require('./ephemeral-keys')

// Generates a keypair of the given type and bitsize
exports.generateKeyPair = (type, bits, cb) => {
  let key = supportedKeys[type.toLowerCase()]

  if (!key) {
    return cb(new Error('invalid or unsupported key type'))
  }

  key.generateKeyPair(bits, cb)
}

// Generates a keypair of the given type and bitsize
// seed is a 32 byte uint8array
exports.generateKeyPairFromSeed = (type, seed, bits, cb) => {
  let key = supportedKeys[type.toLowerCase()]
  if (!key) {
    return cb(new Error('invalid or unsupported key type'))
  }
  if (type.toLowerCase() !== 'ed25519') {
    return cb(new Error('Seed key derivation is unimplemented for RSA or secp256k1'))
  }
  key.generateKeyPairFromSeed(seed, bits, cb)
}

// Converts a protobuf serialized public key into its
// representative object
exports.unmarshalPublicKey = (buf) => {
  const decoded = keysPBM.PublicKey.decode(buf)
  const data = decoded.Data

  switch (decoded.Type) {
    case keysPBM.KeyType.RSA:
      return supportedKeys.rsa.unmarshalRsaPublicKey(data)
    case keysPBM.KeyType.Ed25519:
      return supportedKeys.ed25519.unmarshalEd25519PublicKey(data)
    case keysPBM.KeyType.Secp256k1:
      if (supportedKeys.secp256k1) {
        return supportedKeys.secp256k1.unmarshalSecp256k1PublicKey(data)
      } else {
        throw new Error('secp256k1 support requires libp2p-crypto-secp256k1 package')
      }
    default:
      throw new Error('invalid or unsupported key type')
  }
}

// Converts a public key object into a protobuf serialized public key
exports.marshalPublicKey = (key, type) => {
  type = (type || 'rsa').toLowerCase()
  if (!isValidKeyType(type)) {
    throw new Error('invalid or unsupported key type')
  }

  return key.bytes
}

// Converts a protobuf serialized private key into its
// representative object
exports.unmarshalPrivateKey = (buf, callback) => {
  let decoded
  try {
    decoded = keysPBM.PrivateKey.decode(buf)
  } catch (err) {
    return callback(err)
  }

  const data = decoded.Data

  switch (decoded.Type) {
    case keysPBM.KeyType.RSA:
      return supportedKeys.rsa.unmarshalRsaPrivateKey(data, callback)
    case keysPBM.KeyType.Ed25519:
      return supportedKeys.ed25519.unmarshalEd25519PrivateKey(data, callback)
    case keysPBM.KeyType.Secp256k1:
      if (supportedKeys.secp256k1) {
        return supportedKeys.secp256k1.unmarshalSecp256k1PrivateKey(data, callback)
      } else {
        return callback(new Error('secp256k1 support requires libp2p-crypto-secp256k1 package'))
      }
    default:
      callback(new Error('invalid or unsupported key type'))
  }
}

// Converts a private key object into a protobuf serialized private key
exports.marshalPrivateKey = (key, type) => {
  type = (type || 'rsa').toLowerCase()
  if (!isValidKeyType(type)) {
    throw new Error('invalid or unsupported key type')
  }

  return key.bytes
}
