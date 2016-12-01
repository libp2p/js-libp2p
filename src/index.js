'use strict'

const protobuf = require('protocol-buffers')
const pbm = protobuf(require('./crypto.proto'))
const c = require('./crypto')

exports.hmac = c.hmac
exports.aes = c.aes
exports.webcrypto = c.webcrypto

const keys = exports.keys = require('./keys')
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

// Converts a protobuf serialized public key into its
// representative object
exports.unmarshalPublicKey = (buf) => {
  const decoded = pbm.PublicKey.decode(buf)

  switch (decoded.Type) {
    case pbm.KeyType.RSA:
      return keys.rsa.unmarshalRsaPublicKey(decoded.Data)
    default:
      throw new Error('invalid or unsupported key type')
  }
}

// Converts a public key object into a protobuf serialized public key
exports.marshalPublicKey = (key, type) => {
  type = (type || 'rsa').toLowerCase()

  // for now only rsa is supported
  if (type !== 'rsa') {
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
    default:
      callback(new Error('invalid or unsupported key type'))
  }
}

// Converts a private key object into a protobuf serialized private key
exports.marshalPrivateKey = (key, type) => {
  type = (type || 'rsa').toLowerCase()

  // for now only rsa is supported
  if (type !== 'rsa') {
    throw new Error('invalid or unsupported key type')
  }

  return key.bytes
}

exports.randomBytes = (number) => {
  if (!number || typeof number !== 'number') {
    throw new Error('first argument must be a Number bigger than 0')
  }
  const buf = new Buffer(number)
  c.rsa.getRandomValues(buf)
  return buf
}
