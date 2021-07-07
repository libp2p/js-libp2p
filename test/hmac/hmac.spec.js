/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const uint8ArrayFromString = require('uint8arrays/from-string')

const crypto = require('../../src')

const hashes = ['SHA1', 'SHA256', 'SHA512']

describe('HMAC', () => {
  hashes.forEach((hash) => {
    it(`${hash} - sign and verify`, async () => {
      const hmac = await crypto.hmac.create(hash, uint8ArrayFromString('secret'))
      const sig = await hmac.digest(uint8ArrayFromString('hello world'))
      expect(sig).to.have.length(hmac.length)
    })
  })
})
