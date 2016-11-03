/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const crypto = require('../src')
const fixtures = require('./fixtures/go-stretch-key')

describe('keyStretcher', () => {
  describe('generate', () => {
    const ciphers = ['AES-128', 'AES-256', 'Blowfish']
    const hashes = ['SHA1', 'SHA256', 'SHA512']
    let res
    let secret

    before((done) => {
      crypto.generateEphemeralKeyPair('P-256', (err, _res) => {
        if (err) {
          return done(err)
        }
        res = _res
        res.genSharedKey(res.key, (err, _secret) => {
          if (err) {
            return done(err)
          }

          secret = _secret
          done()
        })
      })
    })

    ciphers.forEach((cipher) => {
      hashes.forEach((hash) => {
        it(`${cipher} - ${hash}`, (done) => {
          crypto.keyStretcher(cipher, hash, secret, (err, keys) => {
            if (err) {
              return done(err)
            }

            expect(keys.k1).to.exist
            expect(keys.k2).to.exist
            done()
          })
        })
      })
    })
  })

  describe('go interop', () => {
    fixtures.forEach((test) => {
      it(`${test.cipher} - ${test.hash}`, (done) => {
        const cipher = test.cipher
        const hash = test.hash
        const secret = test.secret
        crypto.keyStretcher(cipher, hash, secret, (err, keys) => {
          if (err) {
            return done(err)
          }

          expect(keys.k1.iv).to.be.eql(test.k1.iv)
          expect(keys.k1.cipherKey).to.be.eql(test.k1.cipherKey)
          expect(keys.k1.macKey).to.be.eql(test.k1.macKey)

          expect(keys.k2.iv).to.be.eql(test.k2.iv)
          expect(keys.k2.cipherKey).to.be.eql(test.k2.cipherKey)
          expect(keys.k2.macKey).to.be.eql(test.k2.macKey)
          done()
        })
      })
    })
  })
})
