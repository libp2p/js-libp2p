'use strict'

const { sha256 } = require('multiformats/hashes/sha2')
const errcode = require('err-code')
const uint8ArrayEquals = require('uint8arrays/equals')
const uint8ArrayToString = require('uint8arrays/to-string')

const exporter = require('./exporter')

module.exports = (keysProtobuf, randomBytes, crypto) => {
  crypto = crypto || require('./secp256k1')(randomBytes)

  class Secp256k1PublicKey {
    constructor (key) {
      crypto.validatePublicKey(key)
      this._key = key
    }

    verify (data, sig) {
      return crypto.hashAndVerify(this._key, sig, data)
    }

    marshal () {
      return crypto.compressPublicKey(this._key)
    }

    get bytes () {
      return keysProtobuf.PublicKey.encode({
        Type: keysProtobuf.KeyType.Secp256k1,
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
  }

  class Secp256k1PrivateKey {
    constructor (key, publicKey) {
      this._key = key
      this._publicKey = publicKey || crypto.computePublicKey(key)
      crypto.validatePrivateKey(this._key)
      crypto.validatePublicKey(this._publicKey)
    }

    sign (message) {
      return crypto.hashAndSign(this._key, message)
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
     * Exports the key into a password protected `format`
     *
     * @param {string} password - The password to encrypt the key
     * @param {string} [format=libp2p-key] - The format in which to export as
     * @returns {Promise<string>} The encrypted private key
     */
    async export (password, format = 'libp2p-key') { // eslint-disable-line require-await
      if (format === 'libp2p-key') {
        return exporter.export(this.bytes, password)
      } else {
        throw errcode(new Error(`export format '${format}' is not supported`), 'ERR_INVALID_EXPORT_FORMAT')
      }
    }
  }

  function unmarshalSecp256k1PrivateKey (bytes) {
    return new Secp256k1PrivateKey(bytes)
  }

  function unmarshalSecp256k1PublicKey (bytes) {
    return new Secp256k1PublicKey(bytes)
  }

  async function generateKeyPair () {
    const privateKeyBytes = await crypto.generateKey()
    return new Secp256k1PrivateKey(privateKeyBytes)
  }

  return {
    Secp256k1PublicKey,
    Secp256k1PrivateKey,
    unmarshalSecp256k1PrivateKey,
    unmarshalSecp256k1PublicKey,
    generateKeyPair
  }
}
