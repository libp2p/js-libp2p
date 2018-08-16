'use strict'

/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
chai.use(require('chai-string'))

const LIBS = ['ursa', 'keypair']

describe('RSA crypto libs', function () {
  this.timeout(20 * 1000)

  LIBS.forEach(lib => {
    describe(lib, () => {
      let crypto
      let rsa

      before(() => {
        process.env.LP2P_FORCE_CRYPTO_LIB = lib

        for (const path in require.cache) { // clear module cache
          if (path.endsWith('.js')) {
            delete require.cache[path]
          }
        }

        crypto = require('../../src')
        rsa = crypto.keys.supportedKeys.rsa
      })

      it('generates a valid key', (done) => {
        crypto.keys.generateKeyPair('RSA', 512, (err, key) => {
          if (err) {
            return done(err)
          }

          expect(key).to.be.an.instanceof(rsa.RsaPrivateKey)

          key.hash((err, digest) => {
            if (err) {
              return done(err)
            }

            expect(digest).to.have.length(34)
            done()
          })
        })
      })

      after(() => {
        for (const path in require.cache) { // clear module cache
          if (path.endsWith('.js')) {
            delete require.cache[path]
          }
        }

        delete process.env.LP2P_FORCE_CRYPTO_LIB
      })
    })
  })
})
