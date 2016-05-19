/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const crypto = require('../src')

describe('libp2p-crypto', () => {
  let key
  before((done) => {
    crypto.generateKeyPair('RSA', 2048, (err, _key) => {
      if (err) return done(err)
      key = _key
      done()
    })
  })

  it('marshalPublicKey and unmarshalPublicKey', () => {
    const key2 = crypto.unmarshalPublicKey(crypto.marshalPublicKey(key.public))

    expect(key2.equals(key.public)).to.be.eql(true)
  })

  it('marshalPrivateKey and unmarshalPrivateKey', () => {
    const key2 = crypto.unmarshalPrivateKey(crypto.marshalPrivateKey(key))

    expect(key2.equals(key)).to.be.eql(true)
  })
})
