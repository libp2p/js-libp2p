/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const crypto = require('../src')
const fixtures = require('./fixtures/go-stretch-key')

describe('keyStretcher', () => {
  describe('generate', () => {
    const ciphers = ['AES-128', 'AES-256', 'Blowfish']
    const hashes = ['SHA1', 'SHA256']
    // add 'SHA512' when https://github.com/digitalbazaar/forge/issues/401 is resolved
    const res = crypto.generateEphemeralKeyPair('P-256')
    const secret = res.genSharedKey(res.key)

    ciphers.forEach((cipher) => {
      hashes.forEach((hash) => {
        it(`${cipher} - ${hash}`, () => {
          const keys = crypto.keyStretcher(cipher, hash, secret)
          expect(keys.k1).to.exist
          expect(keys.k2).to.exist
        })
      })
    })
  })

  describe('go interop', () => {
    fixtures.forEach((test) => {
      it(`${test.cipher} - ${test.hash}`, () => {
        const cipher = test.cipher
        const hash = test.hash
        const secret = test.secret
        const keys = crypto.keyStretcher(cipher, hash, secret)

        expect(keys.k1.iv).to.be.eql(test.k1.iv)
        expect(keys.k1.cipherKey).to.be.eql(test.k1.cipherKey)
        expect(keys.k1.macKey).to.be.eql(test.k1.macKey)

        expect(keys.k2.iv).to.be.eql(test.k2.iv)
        expect(keys.k2.cipherKey).to.be.eql(test.k2.cipherKey)
        expect(keys.k2.macKey).to.be.eql(test.k2.macKey)
      })
    })
  })
})
