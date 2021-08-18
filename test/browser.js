/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')

const crypto = require('../')
const webcrypto = require('../src/webcrypto')

async function expectMissingWebCrypto (fn) {
  try {
    await fn()
  } catch (err) {
    expect(err.code).to.equal('ERR_MISSING_WEB_CRYPTO')
    return
  }
  throw new Error('Expected missing web crypto error')
}

describe('Missing web crypto', () => {
  let webcryptoGet
  let rsaPrivateKey

  before(async () => {
    rsaPrivateKey = await crypto.keys.generateKeyPair('RSA', 512)
  })

  before(() => {
    webcryptoGet = webcrypto.get
    webcrypto.get = () => webcryptoGet({})
  })

  after(() => {
    webcrypto.get = webcryptoGet
  })

  it('should error for hmac create when web crypto is missing', () => {
    return expectMissingWebCrypto(() => crypto.hmac.create('SHA256', uint8ArrayFromString('secret')))
  })

  it('should error for generate ephemeral key pair when web crypto is missing', () => {
    return expectMissingWebCrypto(() => crypto.keys.generateEphemeralKeyPair('P-256'))
  })

  it('should error for generate rsa key pair when web crypto is missing', () => {
    return expectMissingWebCrypto(() => crypto.keys.generateKeyPair('rsa', 256))
  })

  it('should error for unmarshal RSA private key when web crypto is missing', () => {
    return expectMissingWebCrypto(() => crypto.keys.unmarshalPrivateKey(crypto.keys.marshalPrivateKey(rsaPrivateKey)))
  })

  it('should error for sign RSA private key when web crypto is missing', () => {
    return expectMissingWebCrypto(() => rsaPrivateKey.sign(uint8ArrayFromString('test')))
  })

  it('should error for verify RSA public key when web crypto is missing', () => {
    return expectMissingWebCrypto(() => rsaPrivateKey.public.verify(uint8ArrayFromString('test'), uint8ArrayFromString('test')))
  })
})
