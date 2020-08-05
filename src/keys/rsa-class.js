'use strict'

const sha = require('multihashing-async/src/sha')
const protobuf = require('protons')
const multibase = require('multibase')
const errcode = require('err-code')

require('node-forge/lib/sha512')
require('node-forge/lib/ed25519')
const forge = require('node-forge/lib/forge')

const crypto = require('./rsa')
const pbm = protobuf(require('./keys.proto'))
const exporter = require('./exporter')

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
    return sha.multihashing(this.bytes, 'sha2-256')
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
    return sha.multihashing(this.bytes, 'sha2-256')
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
    return multibase.encode('base58btc', hash).toString().slice(1)
  }

  /**
   * Exports the key into a password protected PEM format
   *
   * @param {string} password - The password to read the encrypted PEM
   * @param {string} [format=pkcs-8] - The format in which to export as
   */
  async export (password, format = 'pkcs-8') { // eslint-disable-line require-await
    if (format === 'pkcs-8') {
      const buffer = new forge.util.ByteBuffer(this.marshal())
      const asn1 = forge.asn1.fromDer(buffer)
      const privateKey = forge.pki.privateKeyFromAsn1(asn1)

      const options = {
        algorithm: 'aes256',
        count: 10000,
        saltSize: 128 / 8,
        prfAlgorithm: 'sha512'
      }
      return forge.pki.encryptRsaPrivateKey(privateKey, password, options)
    } else if (format === 'libp2p-key') {
      return exporter.export(this.bytes, password)
    } else {
      throw errcode(new Error(`export format '${format}' is not supported`), 'ERR_INVALID_EXPORT_FORMAT')
    }
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
