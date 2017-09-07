'use strict'

const multihashing = require('multihashing-async')
const protobuf = require('protons')

const crypto = require('./rsa')
const pbm = protobuf(require('./keys.proto'))

class RsaPublicKey {
  constructor (key) {
    this._key = key
  }

  verify (data, sig, callback) {
    ensure(callback)
    crypto.hashAndVerify(this._key, sig, data, callback)
  }

  marshal () {
    return crypto.utils.jwkToPkix(this._key)
  }

  get bytes () {
    return pbm.PublicKey.encode({
      Type: pbm.KeyType.RSA,
      Data: this.marshal()
    })
  }

  encrypt (bytes) {
    return this._key.encrypt(bytes, 'RSAES-PKCS1-V1_5')
  }

  equals (key) {
    return this.bytes.equals(key.bytes)
  }

  hash (callback) {
    ensure(callback)
    multihashing(this.bytes, 'sha2-256', callback)
  }
}

class RsaPrivateKey {
  // key       - Object of the jwk format
  // publicKey - Buffer of the spki format
  constructor (key, publicKey) {
    this._key = key
    this._publicKey = publicKey
  }

  genSecret () {
    return crypto.getRandomValues(new Uint8Array(16))
  }

  sign (message, callback) {
    ensure(callback)
    crypto.hashAndSign(this._key, message, callback)
  }

  get public () {
    if (!this._publicKey) {
      throw new Error('public key not provided')
    }

    return new RsaPublicKey(this._publicKey)
  }

  decrypt (msg, callback) {
    crypto.decrypt(this._key, msg, callback)
  }

  marshal () {
    return crypto.utils.jwkToPkcs1(this._key)
  }

  get bytes () {
    return pbm.PrivateKey.encode({
      Type: pbm.KeyType.RSA,
      Data: this.marshal()
    })
  }

  equals (key) {
    return this.bytes.equals(key.bytes)
  }

  hash (callback) {
    ensure(callback)
    multihashing(this.bytes, 'sha2-256', callback)
  }
}

function unmarshalRsaPrivateKey (bytes, callback) {
  const jwk = crypto.utils.pkcs1ToJwk(bytes)
  crypto.unmarshalPrivateKey(jwk, (err, keys) => {
    if (err) {
      return callback(err)
    }

    callback(null, new RsaPrivateKey(keys.privateKey, keys.publicKey))
  })
}

function unmarshalRsaPublicKey (bytes) {
  const jwk = crypto.utils.pkixToJwk(bytes)

  return new RsaPublicKey(jwk)
}

function generateKeyPair (bits, cb) {
  crypto.generateKey(bits, (err, keys) => {
    if (err) {
      return cb(err)
    }

    cb(null, new RsaPrivateKey(keys.privateKey, keys.publicKey))
  })
}

function ensure (cb) {
  if (typeof cb !== 'function') {
    throw new Error('callback is required')
  }
}

module.exports = {
  RsaPublicKey,
  RsaPrivateKey,
  unmarshalRsaPublicKey,
  unmarshalRsaPrivateKey,
  generateKeyPair
}
