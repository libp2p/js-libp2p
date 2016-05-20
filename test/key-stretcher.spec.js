/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const crypto = require('../src')

describe('keyStretcher', () => {
  describe('generate', () => {
    const ciphers = ['AES-128', 'AES-256', 'Blowfish']
    const hashes = ['SHA1', 'SHA256']
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
})
