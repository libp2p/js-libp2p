/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
import { expect } from 'aegir/chai'
import * as crypto from '../../src/index.js'
import fixtures from '../fixtures/go-stretch-key.js'
import type { ECDHKey } from '../../src/keys/interface.js'

describe('keyStretcher', () => {
  describe('generate', () => {
    const ciphers = ['AES-128', 'AES-256', 'Blowfish'] as Array<'AES-128' | 'AES-256' | 'Blowfish'>
    const hashes = ['SHA1', 'SHA256', 'SHA512'] as Array<'SHA1' | 'SHA256' | 'SHA512'>
    let res: ECDHKey
    let secret: Uint8Array

    before(async () => {
      res = await crypto.keys.generateEphemeralKeyPair('P-256')
      secret = await res.genSharedKey(res.key)
    })

    ciphers.forEach((cipher) => {
      hashes.forEach((hash) => {
        it(`${cipher} - ${hash}`, async () => {
          const keys = await crypto.keys.keyStretcher(cipher, hash, secret)
          expect(keys.k1).to.exist()
          expect(keys.k2).to.exist()
        })
      })
    })

    it('handles invalid cipher type', () => {
      // @ts-expect-error cipher name is invalid
      return expect(crypto.keys.keyStretcher('invalid-cipher', 'SHA256', 'secret')).to.eventually.be.rejected().with.property('code', 'ERR_INVALID_CIPHER_TYPE')
    })

    it('handles missing hash type', () => {
      // @ts-expect-error secret name is invalid
      return expect(crypto.keys.keyStretcher('AES-128', undefined, 'secret')).to.eventually.be.rejected().with.property('code', 'ERR_MISSING_HASH_TYPE')
    })
  })

  describe('go interop', () => {
    fixtures.forEach((test) => {
      it(`${test.cipher} - ${test.hash}`, async () => {
        const cipher = test.cipher
        const hash = test.hash
        const secret = test.secret
        const keys = await crypto.keys.keyStretcher(cipher, hash, secret)

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
