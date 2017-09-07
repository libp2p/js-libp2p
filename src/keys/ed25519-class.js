'use strict'

const multihashing = require('multihashing-async')
const protobuf = require('protons')

const crypto = require('./ed25519')
const pbm = protobuf(require('./keys.proto'))

class Ed25519PublicKey {
  constructor (key) {
    this._key = ensureKey(key, crypto.publicKeyLength)
  }

  verify (data, sig, callback) {
    ensure(callback)
    crypto.hashAndVerify(this._key, sig, data, callback)
  }

  marshal () {
    return Buffer.from(this._key)
  }

  get bytes () {
    return pbm.PublicKey.encode({
      Type: pbm.KeyType.Ed25519,
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

class Ed25519PrivateKey {
  // key       - 64 byte Uint8Array or Buffer containing private key
  // publicKey - 32 byte Uint8Array or Buffer containing public key
  constructor (key, publicKey) {
    this._key = ensureKey(key, crypto.privateKeyLength)
    this._publicKey = ensureKey(publicKey, crypto.publicKeyLength)
  }

  sign (message, callback) {
    ensure(callback)
    crypto.hashAndSign(this._key, message, callback)
  }

  get public () {
    if (!this._publicKey) {
      throw new Error('public key not provided')
    }

    return new Ed25519PublicKey(this._publicKey)
  }

  marshal () {
    return Buffer.concat([Buffer.from(this._key), Buffer.from(this._publicKey)])
  }

  get bytes () {
    return pbm.PrivateKey.encode({
      Type: pbm.KeyType.Ed25519,
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

function unmarshalEd25519PrivateKey (bytes, callback) {
  try {
    bytes = ensureKey(bytes, crypto.privateKeyLength + crypto.publicKeyLength)
  } catch (err) {
    return callback(err)
  }
  const privateKeyBytes = bytes.slice(0, crypto.privateKeyLength)
  const publicKeyBytes = bytes.slice(crypto.privateKeyLength, bytes.length)
  callback(null, new Ed25519PrivateKey(privateKeyBytes, publicKeyBytes))
}

function unmarshalEd25519PublicKey (bytes) {
  bytes = ensureKey(bytes, crypto.publicKeyLength)
  return new Ed25519PublicKey(bytes)
}

function generateKeyPair (_bits, cb) {
  if (cb === undefined && typeof _bits === 'function') {
    cb = _bits
  }

  crypto.generateKey((err, keys) => {
    if (err) {
      return cb(err)
    }
    let privkey
    try {
      privkey = new Ed25519PrivateKey(keys.secretKey, keys.publicKey)
    } catch (err) {
      cb(err)
      return
    }

    cb(null, privkey)
  })
}

function generateKeyPairFromSeed (seed, _bits, cb) {
  if (cb === undefined && typeof _bits === 'function') {
    cb = _bits
  }

  crypto.generateKeyFromSeed(seed, (err, keys) => {
    if (err) {
      return cb(err)
    }
    let privkey
    try {
      privkey = new Ed25519PrivateKey(keys.secretKey, keys.publicKey)
    } catch (err) {
      cb(err)
      return
    }

    cb(null, privkey)
  })
}

function ensure (cb) {
  if (typeof cb !== 'function') {
    throw new Error('callback is required')
  }
}

function ensureKey (key, length) {
  if (Buffer.isBuffer(key)) {
    key = new Uint8Array(key)
  }
  if (!(key instanceof Uint8Array) || key.length !== length) {
    throw new Error('Key must be a Uint8Array or Buffer of length ' + length)
  }
  return key
}

module.exports = {
  Ed25519PublicKey,
  Ed25519PrivateKey,
  unmarshalEd25519PrivateKey,
  unmarshalEd25519PublicKey,
  generateKeyPair,
  generateKeyPairFromSeed
}
