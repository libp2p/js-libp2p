'use strict'

/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

const { expect } = require('aegir/utils/chai')

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

      it('generates a valid key', async () => {
        const key = await crypto.keys.generateKeyPair('RSA', 512)
        expect(key).to.be.an.instanceof(rsa.RsaPrivateKey)
        const digest = await key.hash()
        expect(digest).to.have.length(34)
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
