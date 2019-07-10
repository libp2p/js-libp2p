'use strict'

const bs58 = require('bs58')
const multihashing = require('multihashing-async')

module.exports = (keysProtobuf, randomBytes, crypto) => {
  crypto = crypto || require('./crypto')(randomBytes)

  class Secp256k1PublicKey {
    constructor (key) {
      crypto.validatePublicKey(key)
      this._key = key
    }

    verify (data, sig, callback) {
      ensure(callback)
      crypto.hashAndVerify(this._key, sig, data, callback)
    }

    marshal () {
      return crypto.compressPublicKey(this._key)
    }

    get bytes () {
      return keysProtobuf.PublicKey.encode({
        Type: keysProtobuf.KeyType.Secp256k1,
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

  class Secp256k1PrivateKey {
    constructor (key, publicKey) {
      this._key = key
      this._publicKey = publicKey || crypto.computePublicKey(key)
      crypto.validatePrivateKey(this._key)
      crypto.validatePublicKey(this._publicKey)
    }

    sign (message, callback) {
      ensure(callback)
      crypto.hashAndSign(this._key, message, callback)
    }

    get public () {
      return new Secp256k1PublicKey(this._publicKey)
    }

    marshal () {
      return this._key
    }

    get bytes () {
      return keysProtobuf.PrivateKey.encode({
        Type: keysProtobuf.KeyType.Secp256k1,
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

    /**
     * Gets the ID of the key.
     *
     * The key id is the base58 encoding of the SHA-256 multihash of its public key.
     * The public key is a protobuf encoding containing a type and the DER encoding
     * of the PKCS SubjectPublicKeyInfo.
     *
     * @param {function(Error, id)} callback
     * @returns {undefined}
     */
    id (callback) {
      this.public.hash((err, hash) => {
        if (err) {
          return callback(err)
        }
        callback(null, bs58.encode(hash))
      })
    }
  }

  function unmarshalSecp256k1PrivateKey (bytes, callback) {
    callback(null, new Secp256k1PrivateKey(bytes))
  }

  function unmarshalSecp256k1PublicKey (bytes) {
    return new Secp256k1PublicKey(bytes)
  }

  function generateKeyPair (_bits, callback) {
    if (callback === undefined && typeof _bits === 'function') {
      callback = _bits
    }

    ensure(callback)

    crypto.generateKey((err, privateKeyBytes) => {
      if (err) { return callback(err) }

      let privkey
      try {
        privkey = new Secp256k1PrivateKey(privateKeyBytes)
      } catch (err) { return callback(err) }

      callback(null, privkey)
    })
  }

  function ensure (callback) {
    if (typeof callback !== 'function') {
      throw new Error('callback is required')
    }
  }

  return {
    Secp256k1PublicKey,
    Secp256k1PrivateKey,
    unmarshalSecp256k1PrivateKey,
    unmarshalSecp256k1PublicKey,
    generateKeyPair
  }
}
