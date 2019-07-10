'use strict'

const protobuf = require('protons')
const keysPBM = protobuf(require('./keys.proto'))
require('node-forge/lib/asn1')
require('node-forge/lib/rsa')
require('node-forge/lib/pbe')
const forge = require('node-forge/lib/forge')

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
exports.generateKeyPair = async (type, bits) => { // eslint-disable-line require-await
  let key = supportedKeys[type.toLowerCase()]

  if (!key) {
    throw new Error('invalid or unsupported key type')
  }

  return key.generateKeyPair(bits)
}

// Generates a keypair of the given type and bitsize
// seed is a 32 byte uint8array
exports.generateKeyPairFromSeed = async (type, seed, bits) => { // eslint-disable-line require-await
  let key = supportedKeys[type.toLowerCase()]
  if (!key) {
    throw new Error('invalid or unsupported key type')
  }
  if (type.toLowerCase() !== 'ed25519') {
    throw new Error('Seed key derivation is unimplemented for RSA or secp256k1')
  }
  return key.generateKeyPairFromSeed(seed, bits)
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
exports.unmarshalPrivateKey = async (buf) => { // eslint-disable-line require-await
  const decoded = keysPBM.PrivateKey.decode(buf)
  const data = decoded.Data

  switch (decoded.Type) {
    case keysPBM.KeyType.RSA:
      return supportedKeys.rsa.unmarshalRsaPrivateKey(data)
    case keysPBM.KeyType.Ed25519:
      return supportedKeys.ed25519.unmarshalEd25519PrivateKey(data)
    case keysPBM.KeyType.Secp256k1:
      if (supportedKeys.secp256k1) {
        return supportedKeys.secp256k1.unmarshalSecp256k1PrivateKey(data)
      } else {
        throw new Error('secp256k1 support requires libp2p-crypto-secp256k1 package')
      }
    default:
      throw new Error('invalid or unsupported key type')
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

exports.import = async (pem, password) => { // eslint-disable-line require-await
  const key = forge.pki.decryptRsaPrivateKey(pem, password)
  if (key === null) {
    throw new Error('Cannot read the key, most likely the password is wrong or not a RSA key')
  }
  let der = forge.asn1.toDer(forge.pki.privateKeyToAsn1(key))
  der = Buffer.from(der.getBytes(), 'binary')
  return supportedKeys.rsa.unmarshalRsaPrivateKey(der)
}
