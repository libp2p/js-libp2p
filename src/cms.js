'use strict'

const async = require('async')
const forge = require('node-forge')
const util = require('./util')

/**
 * Cryptographic Message Syntax (aka PKCS #7)
 *
 * CMS describes an encapsulation syntax for data protection. It
 * is used to digitally sign, digest, authenticate, or encrypt
 * arbitrary message content.
 *
 * See RFC 5652 for all the details.
 */
class CMS {
  /**
   * Creates a new instance with a keychain
   *
   * @param {Keychain} keychain - the available keys
   */
  constructor (keychain) {
    if (!keychain) {
      throw new Error('keychain is required')
    }

    this.keychain = keychain
  }

  /**
   * Creates some protected data.
   *
   * The output Buffer contains the PKCS #7 message in DER.
   *
   * @param {string} name - The local key name.
   * @param {Buffer} plain - The data to encrypt.
   * @param {function(Error, Buffer)} callback
   * @returns {undefined}
   */
  encrypt (name, plain, callback) {
    const self = this
    const done = (err, result) => async.setImmediate(() => callback(err, result))

    if (!Buffer.isBuffer(plain)) {
      return done(new Error('Plain data must be a Buffer'))
    }

    async.series([
      (cb) => self.keychain.findKeyByName(name, cb),
      (cb) => self.keychain._getPrivateKey(name, cb)
    ], (err, results) => {
      if (err) return done(err)

      let key = results[0]
      let pem = results[1]
      try {
        const privateKey = forge.pki.decryptRsaPrivateKey(pem, self.keychain._())
        util.certificateForKey(key, privateKey, (err, certificate) => {
          if (err) return callback(err)

          // create a p7 enveloped message
          const p7 = forge.pkcs7.createEnvelopedData()
          p7.addRecipient(certificate)
          p7.content = forge.util.createBuffer(plain)
          p7.encrypt()

          // convert message to DER
          const der = forge.asn1.toDer(p7.toAsn1()).getBytes()
          done(null, Buffer.from(der, 'binary'))
        })
      } catch (err) {
        done(err)
      }
    })
  }

  /**
   * Reads some protected data.
   *
   * The keychain must contain one of the keys used to encrypt the data.  If none of the keys
   * exists, an Error is returned with the property 'missingKeys'.  It is array of key ids.
   *
   * @param {Buffer} cmsData - The CMS encrypted data to decrypt.
   * @param {function(Error, Buffer)} callback
   * @returns {undefined}
   */
  decrypt (cmsData, callback) {
    const done = (err, result) => async.setImmediate(() => callback(err, result))

    if (!Buffer.isBuffer(cmsData)) {
      return done(new Error('CMS data is required'))
    }

    const self = this
    let cms
    try {
      const buf = forge.util.createBuffer(cmsData.toString('binary'))
      const obj = forge.asn1.fromDer(buf)
      cms = forge.pkcs7.messageFromAsn1(obj)
    } catch (err) {
      return done(new Error('Invalid CMS: ' + err.message))
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
      (r, cb) => self.keychain.findKeyById(r.keyId, (err, info) => cb(null, !err && info)),
      (err, r) => {
        if (err) return done(err)
        if (!r) {
          const missingKeys = recipients.map(r => r.keyId)
          err = new Error('Decryption needs one of the key(s): ' + missingKeys.join(', '))
          err.missingKeys = missingKeys
          return done(err)
        }

        async.waterfall([
          (cb) => self.keychain.findKeyById(r.keyId, cb),
          (key, cb) => self.keychain._getPrivateKey(key.name, cb)
        ], (err, pem) => {
          if (err) return done(err)

          const privateKey = forge.pki.decryptRsaPrivateKey(pem, self.keychain._())
          cms.decrypt(r.recipient, privateKey)
          done(null, Buffer.from(cms.content.getBytes(), 'binary'))
        })
      }
    )
  }
}

module.exports = CMS
