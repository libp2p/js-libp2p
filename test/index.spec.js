/* eslint max-nested-callbacks: ["error", 8] */
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

  it('marshalPrivateKey and unmarshalPrivateKey', (done) => {
    crypto.unmarshalPrivateKey(crypto.marshalPrivateKey(key), (err, key2) => {
      if (err) {
        return done(err)
      }

      expect(key2.equals(key)).to.be.eql(true)
      expect(key2.public.equals(key.public)).to.be.eql(true)
      done()
    })
  })

  // marshalled keys seem to be slightly different
  // unsure as to if this is just a difference in encoding
  // or a bug
  describe('go interop', () => {
    it('unmarshals private key', (done) => {
      crypto.unmarshalPrivateKey(fixtures.private.key, (err, key) => {
        if (err) {
          return done(err)
        }
        const hash = fixtures.private.hash
        expect(fixtures.private.key).to.be.eql(key.bytes)

        key.hash((err, digest) => {
          if (err) {
            return done(err)
          }

          expect(digest).to.be.eql(hash)
          done()
        })
      })
    })

    it('unmarshals public key', (done) => {
      const key = crypto.unmarshalPublicKey(fixtures.public.key)
      const hash = fixtures.public.hash

      expect(crypto.marshalPublicKey(key)).to.be.eql(fixtures.public.key)

      key.hash((err, digest) => {
        if (err) {
          return done(err)
        }

        expect(digest).to.be.eql(hash)
        done()
      })
    })

    it('unmarshal -> marshal, private key', (done) => {
      crypto.unmarshalPrivateKey(fixtures.private.key, (err, key) => {
        if (err) {
          return done(err)
        }

        const marshalled = crypto.marshalPrivateKey(key)
        expect(marshalled).to.be.eql(fixtures.private.key)
        done()
      })
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
