/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const crypto = require('../src')

describe('generateEphemeralKeyPair', () => {
  it('returns a function that generates a shared secret', () => {
    const res = crypto.generateEphemeralKeyPair('P-256')
    const ourPublic = '044374add0df35706db7dade25f3959fc051d2ef5166f8a6a0aa632d0ab41cdb4d30e1a064e121ac56155235a6b8d4c5d8fe35e019f507f4e2ff1445e229d7af43'

    expect(
      res.genSharedKey(ourPublic)
    ).to.have.length(32)

    expect(
      res.key
    ).to.exist
  })
})
