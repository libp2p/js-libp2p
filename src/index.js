'use strict'

const protobuf = require('protocol-buffers')

const pbm = protobuf(require('./crypto.proto'))
const c = require('./crypto')

exports.protobuf = pbm

exports.hmac = c.hmac
exports.aes = c.aes
exports.webcrypto = c.webcrypto

const keys = exports.keys = require('./keys')
function isValidKeyType (keyType) {
  const key = keys[keyType.toLowerCase()]
  return key !== undefined
}

exports.keyStretcher = require('./key-stretcher')
exports.generateEphemeralKeyPair = require('./ephemeral-keys')

// Generates a keypair of the given type and bitsize
exports.generateKeyPair = (type, bits, cb) => {
  let key = keys[type.toLowerCase()]
  if (!key) {
    return cb(new Error('invalid or unsupported key type'))
  }

  key.generateKeyPair(bits, cb)
}

// Generates a keypair of the given type and bitsize
// seed is a 32 byte uint8array
exports.generateKeyPairFromSeed = (type, seed, bits, cb) => {
  let key = keys[type.toLowerCase()]
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
  const decoded = pbm.PublicKey.decode(buf)

  switch (decoded.Type) {
    case pbm.KeyType.RSA:
      return keys.rsa.unmarshalRsaPublicKey(decoded.Data)
    case pbm.KeyType.Ed25519:
      return keys.ed25519.unmarshalEd25519PublicKey(decoded.Data)
    case pbm.KeyType.Secp256k1:
      if (keys.secp256k1) {
        return keys.secp256k1.unmarshalSecp256k1PublicKey(decoded.Data)
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
  const decoded = pbm.PrivateKey.decode(buf)

  switch (decoded.Type) {
    case pbm.KeyType.RSA:
      return keys.rsa.unmarshalRsaPrivateKey(decoded.Data, callback)
    case pbm.KeyType.Ed25519:
      return keys.ed25519.unmarshalEd25519PrivateKey(decoded.Data, callback)
    case pbm.KeyType.Secp256k1:
      if (keys.secp256k1) {
        return keys.secp256k1.unmarshalSecp256k1PrivateKey(decoded.Data, callback)
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

exports.randomBytes = (number) => {
  if (!number || typeof number !== 'number') {
    throw new Error('first argument must be a Number bigger than 0')
  }

  return c.rsa.getRandomValues(new Uint8Array(number))
}
