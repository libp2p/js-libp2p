'use strict'

const multihashing = require('multihashing-async')
const protobuf = require('protons')
const bs58 = require('bs58')
const nextTick = require('async/nextTick')

const crypto = require('./rsa')
const pbm = protobuf(require('./keys.proto'))
require('node-forge/lib/sha512')
require('node-forge/lib/pbe')
const forge = require('node-forge/lib/forge')

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
    return crypto.getRandomValues(16)
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

  /**
   * Exports the key into a password protected PEM format
   *
   * @param {string} [format] - Defaults to 'pkcs-8'.
   * @param {string} password - The password to read the encrypted PEM
   * @param {function(Error, KeyInfo)} callback
   * @returns {undefined}
   */
  export (format, password, callback) {
    if (typeof password === 'function') {
      callback = password
      password = format
      format = 'pkcs-8'
    }

    ensure(callback)

    nextTick(() => {
      let err = null
      let pem = null
      try {
        const buffer = new forge.util.ByteBuffer(this.marshal())
        const asn1 = forge.asn1.fromDer(buffer)
        const privateKey = forge.pki.privateKeyFromAsn1(asn1)
        if (format === 'pkcs-8') {
          const options = {
            algorithm: 'aes256',
            count: 10000,
            saltSize: 128 / 8,
            prfAlgorithm: 'sha512'
          }
          pem = forge.pki.encryptRsaPrivateKey(privateKey, password, options)
        } else {
          err = new Error(`Unknown export format '${format}'`)
        }
      } catch (_err) {
        err = _err
      }

      callback(err, pem)
    })
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

function fromJwk (jwk, callback) {
  crypto.unmarshalPrivateKey(jwk, (err, keys) => {
    if (err) {
      return callback(err)
    }

    callback(null, new RsaPrivateKey(keys.privateKey, keys.publicKey))
  })
}

function generateKeyPair (bits, callback) {
  crypto.generateKey(bits, (err, keys) => {
    if (err) {
      return callback(err)
    }

    callback(null, new RsaPrivateKey(keys.privateKey, keys.publicKey))
  })
}

function ensure (callback) {
  if (typeof callback !== 'function') {
    throw new Error('callback is required')
  }
}

module.exports = {
  RsaPublicKey,
  RsaPrivateKey,
  unmarshalRsaPublicKey,
  unmarshalRsaPrivateKey,
  generateKeyPair,
  fromJwk
}
