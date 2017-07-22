/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const Buffer = require('safe-buffer').Buffer
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const crypto = require('../../src')

const hashes = ['SHA1', 'SHA256', 'SHA512']

describe('HMAC', () => {
  hashes.forEach((hash) => {
    it(`${hash} - sign and verify`, (done) => {
      crypto.hmac.create(hash, Buffer.from('secret'), (err, hmac) => {
        expect(err).to.not.exist()

        hmac.digest(Buffer.from('hello world'), (err, sig) => {
          expect(err).to.not.exist()
          expect(sig).to.have.length(hmac.length)
          done()
        })
      })
    })
  })
})
