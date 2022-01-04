/* eslint-env mocha */
import { expect } from 'aegir/utils/chai.js'
import { isBrowser } from 'wherearewe'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as crypto from '../src/index.js'
import webcrypto from '../src/webcrypto.js'
import { RsaPrivateKey } from '../src/keys/rsa-class.js'

async function expectMissingWebCrypto (fn: () => Promise<any>) {
  await expect(fn()).to.eventually.be.rejected.with.property('code', 'ERR_MISSING_WEB_CRYPTO')
}

describe('Missing web crypto', () => {
  if (!isBrowser) {
    return
  }

  let webcryptoGet: typeof webcrypto.get
  let rsaPrivateKey: RsaPrivateKey

  before(async () => {
    const generated = await crypto.keys.generateKeyPair('RSA', 512)

    if (!(generated instanceof RsaPrivateKey)) {
      throw new Error('Key was incorrect type')
    }

    rsaPrivateKey = generated
  })

  before(() => {
    webcryptoGet = webcrypto.get
    webcrypto.get = () => webcryptoGet()
  })

  after(() => {
    webcrypto.get = webcryptoGet
  })

  it('should error for hmac create when web crypto is missing', async () => {
    return await expectMissingWebCrypto(async () => await crypto.hmac.create('SHA256', uint8ArrayFromString('secret')))
  })

  it('should error for generate ephemeral key pair when web crypto is missing', async () => {
    return await expectMissingWebCrypto(async () => await crypto.keys.generateEphemeralKeyPair('P-256'))
  })

  it('should error for generate rsa key pair when web crypto is missing', async () => {
    return await expectMissingWebCrypto(async () => await crypto.keys.generateKeyPair('RSA', 2048))
  })

  it('should error for unmarshal RSA private key when web crypto is missing', async () => {
    return await expectMissingWebCrypto(async () => await crypto.keys.unmarshalPrivateKey(crypto.keys.marshalPrivateKey(rsaPrivateKey)))
  })

  it('should error for sign RSA private key when web crypto is missing', async () => {
    return await expectMissingWebCrypto(async () => await rsaPrivateKey.sign(uint8ArrayFromString('test')))
  })

  it('should error for verify RSA public key when web crypto is missing', async () => {
    return await expectMissingWebCrypto(async () => await rsaPrivateKey.public.verify(uint8ArrayFromString('test'), uint8ArrayFromString('test')))
  })
})
