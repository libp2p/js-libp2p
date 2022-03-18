import 'node-forge/lib/pkcs7.js'
import 'node-forge/lib/pbe.js'
// @ts-expect-error types are missing
import forge from 'node-forge/lib/forge.js'
import { certificateForKey, findAsync } from './util.js'
import errCode from 'err-code'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { codes } from '../errors.js'
import { logger } from '@libp2p/logger'
import type { KeyChain } from './index.js'

const log = logger('libp2p:keychain:cms')

const privates = new WeakMap<object, { dek: string }>()

/**
 * Cryptographic Message Syntax (aka PKCS #7)
 *
 * CMS describes an encapsulation syntax for data protection. It
 * is used to digitally sign, digest, authenticate, or encrypt
 * arbitrary message content.
 *
 * See RFC 5652 for all the details.
 */
export class CMS {
  private readonly keychain: KeyChain

  /**
   * Creates a new instance with a keychain
   */
  constructor (keychain: KeyChain, dek: string) {
    if (keychain == null) {
      throw errCode(new Error('keychain is required'), codes.ERR_KEYCHAIN_REQUIRED)
    }

    this.keychain = keychain
    privates.set(this, { dek })
  }

  /**
   * Creates some protected data.
   *
   * The output Uint8Array contains the PKCS #7 message in DER.
   */
  async encrypt (name: string, plain: Uint8Array): Promise<Uint8Array> {
    if (!(plain instanceof Uint8Array)) {
      throw errCode(new Error('Plain data must be a Uint8Array'), codes.ERR_INVALID_PARAMETERS)
    }

    const key = await this.keychain.findKeyByName(name)
    const pem = await this.keychain.getPrivateKey(name)
    const cached = privates.get(this)

    if (cached == null) {
      throw errCode(new Error('dek missing'), codes.ERR_INVALID_PARAMETERS)
    }

    const dek = cached.dek
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
   */
  async decrypt (cmsData: Uint8Array): Promise<Uint8Array> {
    if (!(cmsData instanceof Uint8Array)) {
      throw errCode(new Error('CMS data is required'), codes.ERR_INVALID_PARAMETERS)
    }

    let cms: any
    try {
      const buf = forge.util.createBuffer(uint8ArrayToString(cmsData, 'ascii'))
      const obj = forge.asn1.fromDer(buf)

      cms = forge.pkcs7.messageFromAsn1(obj)
    } catch (err: any) {
      log.error(err)
      throw errCode(new Error('Invalid CMS'), codes.ERR_INVALID_CMS)
    }

    // Find a recipient whose key we hold. We only deal with recipient certs
    // issued by ipfs (O=ipfs).
    const recipients: any = cms.recipients
      // @ts-expect-error cms types not defined
      .filter(r => r.issuer.find(a => a.shortName === 'O' && a.value === 'ipfs'))
      // @ts-expect-error cms types not defined
      .filter(r => r.issuer.find(a => a.shortName === 'CN'))
      // @ts-expect-error cms types not defined
      .map(r => {
        return {
          recipient: r,
          // @ts-expect-error cms types not defined
          keyId: r.issuer.find(a => a.shortName === 'CN').value
        }
      })

    const r = await findAsync(recipients, async (recipient: any) => {
      try {
        const key = await this.keychain.findKeyById(recipient.keyId)
        if (key != null) {
          return true
        }
      } catch (err: any) {
        return false
      }
      return false
    })

    if (r == null) {
      // @ts-expect-error cms types not defined
      const missingKeys: string[] = recipients.map(r => r.keyId)
      throw errCode(new Error(`Decryption needs one of the key(s): ${missingKeys.join(', ')}`), codes.ERR_MISSING_KEYS, {
        missingKeys
      })
    }

    const key = await this.keychain.findKeyById(r.keyId)

    if (key == null) {
      throw errCode(new Error('No key available to decrypto'), codes.ERR_NO_KEY)
    }

    const pem = await this.keychain.getPrivateKey(key.name)
    const cached = privates.get(this)

    if (cached == null) {
      throw errCode(new Error('dek missing'), codes.ERR_INVALID_PARAMETERS)
    }

    const dek = cached.dek
    const privateKey = forge.pki.decryptRsaPrivateKey(pem, dek)
    cms.decrypt(r.recipient, privateKey)
    return uint8ArrayFromString(cms.content.getBytes(), 'ascii')
  }
}
