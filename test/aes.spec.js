/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const crypto = require('../src')

const bytes = {
  16: 'AES-128',
  32: 'AES-256'
}

describe('AES-CTR', () => {
  Object.keys(bytes).forEach((byte) => {
    it(`${bytes[byte]} - encrypt and decrypt`, (done) => {
      const key = new Buffer(parseInt(byte, 10))
      key.fill(5)

      const iv = new Buffer(16)
      iv.fill(1)

      crypto.aes.create(key, iv, (err, cipher) => {
        expect(err).to.not.exist

        cipher.encrypt(new Buffer('hello'), (err, res) => {
          expect(err).to.not.exist

          cipher.decrypt(res, (err, res) => {
            expect(err).to.not.exist
            expect(res).to.be.eql(new Buffer('hello'))
            done()
          })
        })
      })
    })
  })
})
