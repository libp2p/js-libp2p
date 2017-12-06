'use strict'

const async = require('async')
const forge = require('node-forge')
const util = require('./util')

class CMS {
  constructor (keystore) {
    if (!keystore) {
      throw new Error('keystore is required')
    }

    this.keystore = keystore
  }

  createAnonymousEncryptedData (name, plain, callback) {
    const self = this
    if (!Buffer.isBuffer(plain)) {
      return callback(new Error('Data is required'))
    }

    self.keystore._getPrivateKey(name, (err, key) => {
      if (err) {
        return callback(err)
      }

      try {
        const privateKey = forge.pki.decryptRsaPrivateKey(key, self.keystore._())
        util.certificateForKey(privateKey, (err, certificate) => {
          if (err) return callback(err)

          // create a p7 enveloped message
          const p7 = forge.pkcs7.createEnvelopedData()
          p7.addRecipient(certificate)
          p7.content = forge.util.createBuffer(plain)
          p7.encrypt()

          // convert message to DER
          const der = forge.asn1.toDer(p7.toAsn1()).getBytes()
          callback(null, Buffer.from(der, 'binary'))
        })
      } catch (err) {
        callback(err)
      }
    })
  }

  readData (cmsData, callback) {
    if (!Buffer.isBuffer(cmsData)) {
      return callback(new Error('CMS data is required'))
    }

    const self = this
    let cms
    try {
      const buf = forge.util.createBuffer(cmsData.toString('binary'))
      const obj = forge.asn1.fromDer(buf)
      cms = forge.pkcs7.messageFromAsn1(obj)
    } catch (err) {
      return callback(new Error('Invalid CMS: ' + err.message))
    }

    // Find a recipient whose key we hold. We only deal with recipient certs
    // issued by ipfs (O=ipfs).
    const recipients = cms.recipients
      .filter(r => r.issuer.find(a => a.shortName === 'O' && a.value === 'ipfs'))
      .filter(r => r.issuer.find(a => a.shortName === 'CN'))
      .map(r => {
        return {
          recipient: r,
          keyId: r.issuer.find(a => a.shortName === 'CN').value
        }
      })
    async.detect(
      recipients,
      (r, cb) => self.keystore.findKeyById(r.keyId, (err, info) => cb(null, !err && info)),
      (err, r) => {
        if (err) return callback(err)
        if (!r) return callback(new Error('No key found for decryption'))

        async.waterfall([
          (cb) => self.keystore.findKeyById(r.keyId, cb),
          (key, cb) => self.keystore._getPrivateKey(key.name, cb)
        ], (err, pem) => {
          if (err) return callback(err)

          const privateKey = forge.pki.decryptRsaPrivateKey(pem, self.keystore._())
          cms.decrypt(r.recipient, privateKey)
          async.setImmediate(() => callback(null, Buffer.from(cms.content.getBytes(), 'binary')))
        })
      }
    )
  }
}

module.exports = CMS
