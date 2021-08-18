'use strict'

const { sha256 } = require('multiformats/hashes/sha2')
const errcode = require('err-code')
const { equals: uint8ArrayEquals } = require('uint8arrays/equals')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

require('node-forge/lib/sha512')
require('node-forge/lib/ed25519')
const forge = require('node-forge/lib/forge')

const crypto = require('./rsa')
const pbm = require('./keys')
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
    }).finish()
  }

  encrypt (bytes) {
    return crypto.encrypt(this._key, bytes)
  }

  equals (key) {
    return uint8ArrayEquals(this.bytes, key.bytes)
  }

  async hash () {
    const { bytes } = await sha256.digest(this.bytes)

    return bytes
  }
}

class RsaPrivateKey {
  // key       - Object of the jwk format
  // publicKey - Uint8Array of the spki format
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
    }).finish()
  }

  equals (key) {
    return uint8ArrayEquals(this.bytes, key.bytes)
  }

  async hash () {
    const { bytes } = await sha256.digest(this.bytes)

    return bytes
  }

  /**
   * Gets the ID of the key.
   *
   * The key id is the base58 encoding of the SHA-256 multihash of its public key.
   * The public key is a protobuf encoding containing a type and the DER encoding
   * of the PKCS SubjectPublicKeyInfo.
   *
   * @returns {Promise<string>}
   */
  async id () {
    const hash = await this.public.hash()
    return uint8ArrayToString(hash, 'base58btc')
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
