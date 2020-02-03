'use strict'

require('node-forge/lib/pkcs7')
require('node-forge/lib/pbe')
const forge = require('node-forge/lib/forge')
const { certificateForKey, findAsync } = require('./util')
const errcode = require('err-code')

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
      throw errcode(new Error('keychain is required'), 'ERR_KEYCHAIN_REQUIRED')
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
   * @returns {undefined}
   */
  async encrypt (name, plain) {
    if (!Buffer.isBuffer(plain)) {
      throw errcode(new Error('Plain data must be a Buffer'), 'ERR_INVALID_PARAMS')
    }

    const key = await this.keychain.findKeyByName(name)
    const pem = await this.keychain._getPrivateKey(name)
    const privateKey = forge.pki.decryptRsaPrivateKey(pem, this.keychain._())
    const certificate = await certificateForKey(key, privateKey)

    // create a p7 enveloped message
    const p7 = forge.pkcs7.createEnvelopedData()
    p7.addRecipient(certificate)
    p7.content = forge.util.createBuffer(plain)
    p7.encrypt()

    // convert message to DER
    const der = forge.asn1.toDer(p7.toAsn1()).getBytes()
    return Buffer.from(der, 'binary')
  }

  /**
   * Reads some protected data.
   *
   * The keychain must contain one of the keys used to encrypt the data.  If none of the keys
   * exists, an Error is returned with the property 'missingKeys'.  It is array of key ids.
   *
   * @param {Buffer} cmsData - The CMS encrypted data to decrypt.
   * @returns {undefined}
   */
  async decrypt (cmsData) {
    if (!Buffer.isBuffer(cmsData)) {
      throw errcode(new Error('CMS data is required'), 'ERR_INVALID_PARAMS')
    }

    let cms
    try {
      const buf = forge.util.createBuffer(cmsData.toString('binary'))
      const obj = forge.asn1.fromDer(buf)
      cms = forge.pkcs7.messageFromAsn1(obj)
    } catch (err) {
      throw errcode(new Error('Invalid CMS: ' + err.message), 'ERR_INVALID_CMS')
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

    const r = await findAsync(recipients, async (recipient) => {
      try {
        const key = await this.keychain.findKeyById(recipient.keyId)
        if (key) return true
      } catch (err) {
        return false
      }
      return false
    })

    if (!r) {
      const missingKeys = recipients.map(r => r.keyId)
      throw errcode(new Error('Decryption needs one of the key(s): ' + missingKeys.join(', ')), 'ERR_MISSING_KEYS', {
        missingKeys
      })
    }

    const key = await this.keychain.findKeyById(r.keyId)
    const pem = await this.keychain._getPrivateKey(key.name)
    const privateKey = forge.pki.decryptRsaPrivateKey(pem, this.keychain._())
    cms.decrypt(r.recipient, privateKey)
    return Buffer.from(cms.content.getBytes(), 'binary')
  }
}

module.exports = CMS
