'use strict'

const errcode = require('err-code')
const { equals: uint8ArrayEquals } = require('uint8arrays/equals')
const { sha256 } = require('multiformats/hashes/sha2')
const { base58btc } = require('multiformats/bases/base58')
const { identity } = require('multiformats/hashes/identity')
const crypto = require('./ed25519')
const pbm = require('./keys')
const exporter = require('./exporter')

class Ed25519PublicKey {
  constructor (key) {
    this._key = ensureKey(key, crypto.publicKeyLength)
  }

  async verify (data, sig) { // eslint-disable-line require-await
    return crypto.hashAndVerify(this._key, sig, data)
  }

  marshal () {
    return this._key
  }

  get bytes () {
    return pbm.PublicKey.encode({
      Type: pbm.KeyType.Ed25519,
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

class Ed25519PrivateKey {
  // key       - 64 byte Uint8Array containing private key
  // publicKey - 32 byte Uint8Array containing public key
  constructor (key, publicKey) {
    this._key = ensureKey(key, crypto.privateKeyLength)
    this._publicKey = ensureKey(publicKey, crypto.publicKeyLength)
  }

  async sign (message) { // eslint-disable-line require-await
    return crypto.hashAndSign(this._key, message)
  }

  get public () {
    return new Ed25519PublicKey(this._publicKey)
  }

  marshal () {
    return this._key
  }

  get bytes () {
    return pbm.PrivateKey.encode({
      Type: pbm.KeyType.Ed25519,
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
   * The key id is the base58 encoding of the identity multihash containing its public key.
   * The public key is a protobuf encoding containing a type and the DER encoding
   * of the PKCS SubjectPublicKeyInfo.
   *
   * @returns {Promise<string>}
   */
  async id () {
    const encoding = await identity.digest(this.public.bytes)
    return base58btc.encode(encoding.bytes).substring(1)
  }

  /**
   * Exports the key into a password protected `format`
   *
   * @param {string} password - The password to encrypt the key
   * @param {string} [format=libp2p-key] - The format in which to export as
   * @returns {Promise<Uint8Array>} The encrypted private key
   */
  async export (password, format = 'libp2p-key') { // eslint-disable-line require-await
    if (format === 'libp2p-key') {
      return exporter.export(this.bytes, password)
    } else {
      throw errcode(new Error(`export format '${format}' is not supported`), 'ERR_INVALID_EXPORT_FORMAT')
    }
  }
}

function unmarshalEd25519PrivateKey (bytes) {
  // Try the old, redundant public key version
  if (bytes.length > crypto.privateKeyLength) {
    bytes = ensureKey(bytes, crypto.privateKeyLength + crypto.publicKeyLength)
    const privateKeyBytes = bytes.slice(0, crypto.privateKeyLength)
    const publicKeyBytes = bytes.slice(crypto.privateKeyLength, bytes.length)
    return new Ed25519PrivateKey(privateKeyBytes, publicKeyBytes)
  }

  bytes = ensureKey(bytes, crypto.privateKeyLength)
  const privateKeyBytes = bytes.slice(0, crypto.privateKeyLength)
  const publicKeyBytes = bytes.slice(crypto.publicKeyLength)
  return new Ed25519PrivateKey(privateKeyBytes, publicKeyBytes)
}

function unmarshalEd25519PublicKey (bytes) {
  bytes = ensureKey(bytes, crypto.publicKeyLength)
  return new Ed25519PublicKey(bytes)
}

async function generateKeyPair () {
  const { privateKey, publicKey } = await crypto.generateKey()
  return new Ed25519PrivateKey(privateKey, publicKey)
}

async function generateKeyPairFromSeed (seed) {
  const { privateKey, publicKey } = await crypto.generateKeyFromSeed(seed)
  return new Ed25519PrivateKey(privateKey, publicKey)
}

function ensureKey (key, length) {
  key = Uint8Array.from(key || [])
  if (key.length !== length) {
    throw errcode(new Error(`Key must be a Uint8Array of length ${length}, got ${key.length}`), 'ERR_INVALID_KEY_TYPE')
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
