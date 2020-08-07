'use strict'

const protobuf = require('protons')
const keysPBM = protobuf(require('./keys.proto'))
require('node-forge/lib/asn1')
require('node-forge/lib/pbe')
const forge = require('node-forge/lib/forge')
const errcode = require('err-code')
const uint8ArrayFromString = require('uint8arrays/from-string')

const importer = require('./importer')

exports = module.exports

const supportedKeys = {
  rsa: require('./rsa-class'),
  ed25519: require('./ed25519-class'),
  secp256k1: require('./secp256k1-class')(keysPBM, require('../random-bytes'))
}

exports.supportedKeys = supportedKeys
exports.keysPBM = keysPBM

const ErrMissingSecp256K1 = {
  message: 'secp256k1 support requires libp2p-crypto-secp256k1 package',
  code: 'ERR_MISSING_PACKAGE'
}

function typeToKey (type) {
  const key = supportedKeys[type.toLowerCase()]
  if (!key) {
    const supported = Object.keys(supportedKeys).join(' / ')
    throw errcode(new Error(`invalid or unsupported key type ${type}. Must be ${supported}`), 'ERR_UNSUPPORTED_KEY_TYPE')
  }
  return key
}

exports.keyStretcher = require('./key-stretcher')
exports.generateEphemeralKeyPair = require('./ephemeral-keys')

// Generates a keypair of the given type and bitsize
exports.generateKeyPair = async (type, bits) => { // eslint-disable-line require-await
  return typeToKey(type).generateKeyPair(bits)
}

// Generates a keypair of the given type and bitsize
// seed is a 32 byte uint8array
exports.generateKeyPairFromSeed = async (type, seed, bits) => { // eslint-disable-line require-await
  const key = typeToKey(type)
  if (type.toLowerCase() !== 'ed25519') {
    throw errcode(new Error('Seed key derivation is unimplemented for RSA or secp256k1'), 'ERR_UNSUPPORTED_KEY_DERIVATION_TYPE')
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
        throw errcode(new Error(ErrMissingSecp256K1.message), ErrMissingSecp256K1.code)
      }
    default:
      typeToKey(decoded.Type) // throws because type is not supported
  }
}

// Converts a public key object into a protobuf serialized public key
exports.marshalPublicKey = (key, type) => {
  type = (type || 'rsa').toLowerCase()
  typeToKey(type) // check type
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
        throw errcode(new Error(ErrMissingSecp256K1.message), ErrMissingSecp256K1.code)
      }
    default:
      typeToKey(decoded.Type) // throws because type is not supported
  }
}

// Converts a private key object into a protobuf serialized private key
exports.marshalPrivateKey = (key, type) => {
  type = (type || 'rsa').toLowerCase()
  typeToKey(type) // check type
  return key.bytes
}

/**
 *
 * @param {string} encryptedKey
 * @param {string} password
 */
exports.import = async (encryptedKey, password) => { // eslint-disable-line require-await
  try {
    const key = await importer.import(encryptedKey, password)
    return exports.unmarshalPrivateKey(key)
  } catch (_) {
    // Ignore and try the old pem decrypt
  }

  // Only rsa supports pem right now
  const key = forge.pki.decryptRsaPrivateKey(encryptedKey, password)
  if (key === null) {
    throw errcode(new Error('Cannot read the key, most likely the password is wrong or not a RSA key'), 'ERR_CANNOT_DECRYPT_PEM')
  }
  let der = forge.asn1.toDer(forge.pki.privateKeyToAsn1(key))
  der = uint8ArrayFromString(der.getBytes(), 'ascii')
  return supportedKeys.rsa.unmarshalRsaPrivateKey(der)
}
