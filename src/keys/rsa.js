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
    md.update(data, 'utf8')

    return this._key.verify(md.digest().bytes(), sig)
  }

  marshal () {
    return forge.asn1.toDer(pki.privateKeyToAsn1(this._key)).bytes()
  }

  get bytes () {
    return pbm.PublicKey.encode({
      Type: pbm.KeyType.RSA,
      Data: this.marhal()
    })
  }

  encrypt (bytes) {
    return this._key.encrypt(bytes, 'RSAES-PKCS1-V1_5')
  }

  equals (key) {
    return this.bytes === key.bytes
  }

  hash () {
    return utils.keyHash(this.bytes)
  }
}

class RsaPrivateKey {
  constructor (privKey, pubKey) {
    this._privateKey = privKey
    this._publicKey = pubKey
  }

  genSecret () {
    return forge.random.getBytesSync(16)
  }

  sign (message) {
    const md = forge.md.sha256.create()
    md.update(message, 'utf8')

    return this._privateKey.sign(md)
  }

  get public () {
    return new RsaPublicKey(this._publicKey)
  }

  decrypt (bytes) {
    return this._privateKey.decrypt(bytes, 'RSAES-PKCS1-V1_5')
  }

  marshal () {
    return forge.asn1.toDer(pki.privateKeyToAsn1(this._privateKey)).bytes()
  }

  get bytes () {
    return pbm.PrivateKey.encode({
      Type: pbm.KeyType.RSA,
      Data: this.marshal()
    })
  }

  equals (key) {
    return this.bytes === key.bytes
  }

  hash () {
    return utils.keyHash(this.bytes)
  }
}

function unmarshalRsaPrivateKey (bytes) {
  const key = pki.privateKeyFromAsn1(forge.asn1.fromDer(bytes))

  return new RsaPrivateKey(key)
}

function unmarshalRsaPublicKey (bytes) {
  const key = pki.publicKeyFromAsn1(forge.asn1.fromDer(bytes))

  return new RsaPublicKey(key)
}

module.exports = function generateRSAKey (bits, cb) {
  rsa.generateKeyPair({bits}, (err, keypair) => {
    if (err) return cb(err)

    cb(null, new RSAKey(keypair.publicKey, keypair.privateKey))
  })
}
