/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const crypto = require('../src')

describe('libp2p-crypto', () => {
  describe('generateKeyPair', () => {
    describe('RSA', () => {
      it('generates a valid key', () => {
        const key = crypto.generateKeyPair('RSA', 2048)

        expect(key).to.have.property('publicKey')
        expect(key).to.have.property('privateKey')
        expect(key).to.have.property('buffer')
      })
    })
  })
})
