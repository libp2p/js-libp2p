'use strict'

// @ts-ignore node-forge types not exported
require('node-forge/lib/pkcs7')
// @ts-ignore node-forge types not exported
require('node-forge/lib/pbe')
// @ts-ignore node-forge types not exported
const forge = require('node-forge/lib/forge')
const { certificateForKey, findAsync } = require('./util')
const errcode = require('err-code')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

const privates = new WeakMap()

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
   * @param {import('./index')} keychain - the available keys
   * @param {string} dek
   */
  constructor (keychain, dek) {
    if (!keychain) {
      throw errcode(new Error('keychain is required'), 'ERR_KEYCHAIN_REQUIRED')
    }

    this.keychain = keychain
    privates.set(this, { dek })
  }

  /**
   * Creates some protected data.
   *
   * The output Uint8Array contains the PKCS #7 message in DER.
   *
   * @param {string} name - The local key name.
   * @param {Uint8Array} plain - The data to encrypt.
   * @returns {Promise<Uint8Array>}
   */
  async encrypt (name, plain) {
    if (!(plain instanceof Uint8Array)) {
      throw errcode(new Error('Plain data must be a Uint8Array'), 'ERR_INVALID_PARAMS')
    }

    const key = await this.keychain.findKeyByName(name)
    const pem = await this.keychain._getPrivateKey(name)
    /** @type {string} */
    const dek = privates.get(this).dek
    const privateKey = forge.pki.decryptRsaPrivateKey(pem, dek)
    const certificate = await certificateForKey(key, privateKey)

    // create a p7 enveloped message
    const p7 = forge.pkcs7.createEnvelopedData()
    p7.addRecipient(certificate)
    p7.content = forge.util.createBuffer(plain)
    p7.encrypt()

    // convert message to DER
    const der = forge.asn1.toDer(p7.toAsn1()).getBytes()
    return uint8ArrayFromString(der, 'ascii')
  }

  /**
   * Reads some protected data.
   *
   * The keychain must contain one of the keys used to encrypt the data.  If none of the keys
   * exists, an Error is returned with the property 'missingKeys'.  It is array of key ids.
   *
   * @param {Uint8Array} cmsData - The CMS encrypted data to decrypt.
   * @returns {Promise<Uint8Array>}
   */
  async decrypt (cmsData) {
    if (!(cmsData instanceof Uint8Array)) {
      throw errcode(new Error('CMS data is required'), 'ERR_INVALID_PARAMS')
    }

    let cms
    try {
      const buf = forge.util.createBuffer(uint8ArrayToString(cmsData, 'ascii'))
      const obj = forge.asn1.fromDer(buf)
      // @ts-ignore not defined
      cms = forge.pkcs7.messageFromAsn1(obj)
    } catch (err) {
      throw errcode(new Error('Invalid CMS: ' + err.message), 'ERR_INVALID_CMS')
    }

    // Find a recipient whose key we hold. We only deal with recipient certs
    // issued by ipfs (O=ipfs).
    const recipients = cms.recipients
      // @ts-ignore cms types not defined
      .filter(r => r.issuer.find(a => a.shortName === 'O' && a.value === 'ipfs'))
      // @ts-ignore cms types not defined
      .filter(r => r.issuer.find(a => a.shortName === 'CN'))
      // @ts-ignore cms types not defined
      .map(r => {
        return {
          recipient: r,
          // @ts-ignore cms types not defined
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
      // @ts-ignore cms types not defined
      const missingKeys = recipients.map(r => r.keyId)
      throw errcode(new Error('Decryption needs one of the key(s): ' + missingKeys.join(', ')), 'ERR_MISSING_KEYS', {
        missingKeys
      })
    }

    const key = await this.keychain.findKeyById(r.keyId)

    if (!key) {
      throw errcode(new Error('No key available to decrypto'), 'ERR_NO_KEY')
    }

    const pem = await this.keychain._getPrivateKey(key.name)
    const dek = privates.get(this).dek
    const privateKey = forge.pki.decryptRsaPrivateKey(pem, dek)
    cms.decrypt(r.recipient, privateKey)
    return uint8ArrayFromString(cms.content.getBytes(), 'ascii')
  }
}

module.exports = CMS
