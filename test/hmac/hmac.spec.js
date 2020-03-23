/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'
const { Buffer } = require('buffer')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const crypto = require('../../src')

const hashes = ['SHA1', 'SHA256', 'SHA512']

describe('HMAC', () => {
  hashes.forEach((hash) => {
    it(`${hash} - sign and verify`, async () => {
      const hmac = await crypto.hmac.create(hash, Buffer.from('secret'))
      const sig = await hmac.digest(Buffer.from('hello world'))
      expect(sig).to.have.length(hmac.length)
    })
  })
})
