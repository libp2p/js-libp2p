/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const crypto = require('../src')

const hashes = ['SHA1', 'SHA256', 'SHA512']

describe('HMAC', () => {
  hashes.forEach((hash) => {
    it(`${hash} - sign and verify`, (done) => {
      crypto.hmac.create(hash, new Buffer('secret'), (err, hmac) => {
        expect(err).to.not.exist

        hmac.digest(new Buffer('hello world'), (err, sig) => {
          expect(err).to.not.exist
          expect(sig).to.have.length(hmac.length)
          done()
        })
      })
    })
  })
})
