'use strict'

const forge = require('node-forge')
const protobuf = require('protocol-buffers')
const fs = require('fs')
const path = require('path')

const utils = require('../utils')

const pki = forge.pki
const rsa = pki.rsa

const pbm = protobuf(fs.readFileSync(path.join(__dirname, '../crypto.proto')))

class RsaPublicKey {
  constructor (k) {
    this._key = k
  }

  verify (data, sig) {
    const md = forge.md.sha256.create()
    if (Buffer.isBuffer(data)) {
      md.update(data.toString('binary'), 'binary')
    } else {
      md.update(data)
    }

    return this._key.verify(md.digest().bytes(), sig)
  }

  marshal () {
    return new Buffer(forge.asn1.toDer(pki.publicKeyToAsn1(this._key)).bytes(), 'binary')
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

  hash () {
    return utils.keyHash(this.bytes)
  }
}

class RsaPrivateKey {
  constructor (privKey, pubKey) {
    this._privateKey = privKey
    if (pubKey) {
      this._publicKey = pubKey
    } else {
      this._publicKey = forge.pki.setRsaPublicKey(privKey.n, privKey.e)
    }
  }

  genSecret () {
    return forge.random.getBytesSync(16)
  }

  sign (message) {
    const md = forge.md.sha256.create()
    if (Buffer.isBuffer(message)) {
      md.update(message.toString('binary'), 'binary')
    } else {
      md.update(message)
    }
    const raw = this._privateKey.sign(md, 'RSASSA-PKCS1-V1_5')
    return new Buffer(raw, 'binary')
  }

  get public () {
    if (!this._publicKey) {
      throw new Error('public key not provided')
    }

    return new RsaPublicKey(this._publicKey)
  }

  decrypt (bytes) {
    return this._privateKey.decrypt(bytes, 'RSAES-PKCS1-V1_5')
  }

  marshal () {
    return new Buffer(forge.asn1.toDer(pki.privateKeyToAsn1(this._privateKey)).bytes(), 'binary')
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

  hash () {
    return utils.keyHash(this.bytes)
  }
}

function unmarshalRsaPrivateKey (bytes) {
  if (Buffer.isBuffer(bytes)) {
    bytes = forge.util.createBuffer(bytes.toString('binary'))
  }
  const key = pki.privateKeyFromAsn1(forge.asn1.fromDer(bytes))

  return new RsaPrivateKey(key)
}

function unmarshalRsaPublicKey (bytes) {
  if (Buffer.isBuffer(bytes)) {
    bytes = forge.util.createBuffer(bytes.toString('binary'))
  }
  const key = pki.publicKeyFromAsn1(forge.asn1.fromDer(bytes))

  return new RsaPublicKey(key)
}

function generateKeyPair (bits) {
  const p = rsa.generateKeyPair({bits})
  return new RsaPrivateKey(p.privateKey, p.publicKey)
}

module.exports = {
  RsaPublicKey,
  RsaPrivateKey,
  unmarshalRsaPublicKey,
  unmarshalRsaPrivateKey,
  generateKeyPair
}
