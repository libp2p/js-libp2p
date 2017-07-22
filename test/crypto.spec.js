/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const crypto = require('../src')
const fixtures = require('./fixtures/go-key-rsa')

describe('libp2p-crypto', () => {
  let key
  before((done) => {
    crypto.keys.generateKeyPair('RSA', 2048, (err, _key) => {
      if (err) {
        return done(err)
      }
      key = _key
      done()
    })
  })

  it('marshalPublicKey and unmarshalPublicKey', () => {
    const key2 = crypto.keys.unmarshalPublicKey(
      crypto.keys.marshalPublicKey(key.public))

    expect(key2.equals(key.public)).to.be.eql(true)

    expect(() => {
      crypto.keys.marshalPublicKey(key.public, 'invalid-key-type')
    }).to.throw()
  })

  it('marshalPrivateKey and unmarshalPrivateKey', (done) => {
    expect(() => {
      crypto.keys.marshalPrivateKey(key, 'invalid-key-type')
    }).to.throw()

    crypto.keys.unmarshalPrivateKey(crypto.keys.marshalPrivateKey(key), (err, key2) => {
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
      crypto.keys.unmarshalPrivateKey(fixtures.private.key, (err, key) => {
        if (err) {
          return done(err)
        }
        const hash = fixtures.private.hash
        expect(fixtures.private.key).to.eql(key.bytes)

        key.hash((err, digest) => {
          if (err) {
            return done(err)
          }

          expect(digest).to.eql(hash)
          done()
        })
      })
    })

    it('unmarshals public key', (done) => {
      const key = crypto.keys.unmarshalPublicKey(fixtures.public.key)
      const hash = fixtures.public.hash

      expect(crypto.keys.marshalPublicKey(key)).to.eql(fixtures.public.key)

      key.hash((err, digest) => {
        if (err) {
          return done(err)
        }

        expect(digest).to.eql(hash)
        done()
      })
    })

    it('unmarshal -> marshal, private key', (done) => {
      crypto.keys.unmarshalPrivateKey(fixtures.private.key, (err, key) => {
        if (err) {
          return done(err)
        }

        const marshalled = crypto.keys.marshalPrivateKey(key)
        expect(marshalled).to.eql(fixtures.private.key)
        done()
      })
    })

    it('unmarshal -> marshal, public key', () => {
      const key = crypto.keys.unmarshalPublicKey(fixtures.public.key)
      const marshalled = crypto.keys.marshalPublicKey(key)
      expect(fixtures.public.key.equals(marshalled)).to.eql(true)
    })
  })

  describe('randomBytes', () => {
    it('throws with no number passed', () => {
      expect(() => {
        crypto.randomBytes()
      }).to.throw()
    })

    it('generates different random things', () => {
      const buf1 = crypto.randomBytes(10)
      expect(buf1.length).to.equal(10)
      const buf2 = crypto.randomBytes(10)
      expect(buf1).to.not.eql(buf2)
    })
  })
})
