/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const crypto = require('../src')
const fixtures = require('./fixtures/go-key-rsa')

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

  describe('go interop', () => {
    it('unmarshals private key', () => {
      const key = crypto.unmarshalPrivateKey(fixtures.private.key)
      const hash = fixtures.private.hash

      expect(
        key.hash()
      ).to.be.eql(
        hash
      )
    })

    it('unmarshals public key', () => {
      const key = crypto.unmarshalPublicKey(fixtures.public.key)
      const hash = fixtures.public.hash

      expect(
        key.hash()
      ).to.be.eql(
        hash
      )
    })

    it('unmarshal -> marshal, private key', () => {
      const key = crypto.unmarshalPrivateKey(fixtures.private.key)
      const marshalled = crypto.marshalPrivateKey(key)
      expect(
        fixtures.private.key.equals(marshalled)
      ).to.be.eql(
        true
      )
    })

    it('unmarshal -> marshal, public key', () => {
      const key = crypto.unmarshalPublicKey(fixtures.public.key)
      const marshalled = crypto.marshalPublicKey(key)
      expect(
        fixtures.public.key.equals(marshalled)
      ).to.be.eql(
        true
      )
    })
  })
})
