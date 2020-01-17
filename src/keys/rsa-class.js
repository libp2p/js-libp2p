'use strict'

const multihashing = require('multihashing-async')
const protobuf = require('protons')
const bs58 = require('bs58')
const errcode = require('err-code')

const crypto = require('./rsa')
const pbm = protobuf(require('./keys.proto'))
require('node-forge/lib/sha512')
require('node-forge/lib/pbe')
const forge = require('node-forge/lib/forge')

class RsaPublicKey {
  constructor (key) {
    this._key = key
  }

  async verify (data, sig) { // eslint-disable-line require-await
    return crypto.hashAndVerify(this._key, sig, data)
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
    return crypto.encrypt(this._key, bytes)
  }

  equals (key) {
    return this.bytes.equals(key.bytes)
  }

  async hash () { // eslint-disable-line require-await
    return multihashing(this.bytes, 'sha2-256')
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

  async sign (message) { // eslint-disable-line require-await
    return crypto.hashAndSign(this._key, message)
  }

  get public () {
    if (!this._publicKey) {
      throw errcode(new Error('public key not provided'), 'ERR_PUBKEY_NOT_PROVIDED')
    }

    return new RsaPublicKey(this._publicKey)
  }

  decrypt (bytes) {
    return crypto.decrypt(this._key, bytes)
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

  async hash () { // eslint-disable-line require-await
    return multihashing(this.bytes, 'sha2-256')
  }

  /**
   * Gets the ID of the key.
   *
   * The key id is the base58 encoding of the SHA-256 multihash of its public key.
   * The public key is a protobuf encoding containing a type and the DER encoding
   * of the PKCS SubjectPublicKeyInfo.
   *
   * @returns {Promise<String>}
   */
  async id () {
    const hash = await this.public.hash()
    return bs58.encode(hash)
  }

  /**
   * Exports the key into a password protected PEM format
   *
   * @param {string} password - The password to read the encrypted PEM
   * @param {string} [format] - Defaults to 'pkcs-8'.
   */
  async export (password, format = 'pkcs-8') { // eslint-disable-line require-await
    let pem = null

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
      throw errcode(new Error(`Unknown export format '${format}'. Must be pkcs-8`), 'ERR_INVALID_EXPORT_FORMAT')
    }

    return pem
  }
}

async function unmarshalRsaPrivateKey (bytes) {
  const jwk = crypto.utils.pkcs1ToJwk(bytes)
  const keys = await crypto.unmarshalPrivateKey(jwk)
  return new RsaPrivateKey(keys.privateKey, keys.publicKey)
}

function unmarshalRsaPublicKey (bytes) {
  const jwk = crypto.utils.pkixToJwk(bytes)
  return new RsaPublicKey(jwk)
}

async function fromJwk (jwk) {
  const keys = await crypto.unmarshalPrivateKey(jwk)
  return new RsaPrivateKey(keys.privateKey, keys.publicKey)
}

async function generateKeyPair (bits) {
  const keys = await crypto.generateKey(bits)
  return new RsaPrivateKey(keys.privateKey, keys.publicKey)
}

module.exports = {
  RsaPublicKey,
  RsaPrivateKey,
  unmarshalRsaPublicKey,
  unmarshalRsaPrivateKey,
  generateKeyPair,
  fromJwk
}
