/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const crypto = require('../../src')
const ed25519 = crypto.keys.supportedKeys.ed25519
const fixtures = require('../fixtures/go-key-ed25519')

const testGarbage = require('../helpers/test-garbage-error-handling')

describe('ed25519', function () {
  this.timeout(20 * 1000)
  let key
  before((done) => {
    crypto.keys.generateKeyPair('Ed25519', 512, (err, _key) => {
      if (err) return done(err)
      key = _key
      done()
    })
  })

  it('generates a valid key', (done) => {
    expect(key).to.be.an.instanceof(ed25519.Ed25519PrivateKey)

    key.hash((err, digest) => {
      if (err) {
        return done(err)
      }

      expect(digest).to.have.length(34)
      done()
    })
  })

  it('generates a valid key from seed', (done) => {
    var seed = crypto.randomBytes(32)
    crypto.keys.generateKeyPairFromSeed('Ed25519', seed, 512, (err, seededkey) => {
      if (err) return done(err)
      expect(seededkey).to.be.an.instanceof(ed25519.Ed25519PrivateKey)

      seededkey.hash((err, digest) => {
        if (err) {
          return done(err)
        }

        expect(digest).to.have.length(34)
        done()
      })
    })
  })

  it('generates the same key from the same seed', (done) => {
    var seed = crypto.randomBytes(32)
    crypto.keys.generateKeyPairFromSeed('Ed25519', seed, 512, (err, seededkey1) => {
      if (err) return done(err)
      crypto.keys.generateKeyPairFromSeed('Ed25519', seed, 512, (err, seededkey2) => {
        if (err) return done(err)
        expect(seededkey1.equals(seededkey2)).to.eql(true)
        expect(seededkey1.public.equals(seededkey2.public)).to.eql(true)
        done()
      })
    })
  })

  it('generates different keys for different seeds', (done) => {
    const seed1 = crypto.randomBytes(32)
    crypto.keys.generateKeyPairFromSeed('Ed25519', seed1, 512, (err, seededkey1) => {
      expect(err).to.not.exist()

      const seed2 = crypto.randomBytes(32)
      crypto.keys.generateKeyPairFromSeed('Ed25519', seed2, 512, (err, seededkey2) => {
        expect(err).to.not.exist()

        expect(seededkey1.equals(seededkey2)).to.eql(false)
        expect(seededkey1.public.equals(seededkey2.public))
          .to.eql(false)
        done()
      })
    })
  })

  it('signs', (done) => {
    const text = crypto.randomBytes(512)

    key.sign(text, (err, sig) => {
      expect(err).to.not.exist()

      key.public.verify(text, sig, (err, res) => {
        expect(err).to.not.exist()
        expect(res).to.be.eql(true)
        done()
      })
    })
  })

  it('encoding', (done) => {
    const keyMarshal = key.marshal()
    ed25519.unmarshalEd25519PrivateKey(keyMarshal, (err, key2) => {
      if (err) {
        return done(err)
      }
      const keyMarshal2 = key2.marshal()

      expect(keyMarshal).to.eql(keyMarshal2)

      const pk = key.public
      const pkMarshal = pk.marshal()
      const pk2 = ed25519.unmarshalEd25519PublicKey(pkMarshal)
      const pkMarshal2 = pk2.marshal()

      expect(pkMarshal).to.eql(pkMarshal2)
      done()
    })
  })

  describe('key equals', () => {
    it('equals itself', () => {
      expect(
        key.equals(key)
      ).to.eql(
        true
      )

      expect(
        key.public.equals(key.public)
      ).to.eql(
        true
      )
    })

    it('not equals other key', (done) => {
      crypto.keys.generateKeyPair('Ed25519', 512, (err, key2) => {
        if (err) return done(err)

        expect(key.equals(key2)).to.eql(false)
        expect(key2.equals(key)).to.eql(false)
        expect(key.public.equals(key2.public)).to.eql(false)
        expect(key2.public.equals(key.public)).to.eql(false)
        done()
      })
    })
  })

  it('sign and verify', (done) => {
    const data = Buffer.from('hello world')
    key.sign(data, (err, sig) => {
      if (err) {
        return done(err)
      }

      key.public.verify(data, sig, (err, valid) => {
        if (err) {
          return done(err)
        }
        expect(valid).to.eql(true)
        done()
      })
    })
  })

  it('fails to verify for different data', (done) => {
    const data = Buffer.from('hello world')
    key.sign(data, (err, sig) => {
      if (err) {
        return done(err)
      }

      key.public.verify(Buffer.from('hello'), sig, (err, valid) => {
        if (err) {
          return done(err)
        }
        expect(valid).to.be.eql(false)
        done()
      })
    })
  })

  describe('returns error via cb instead of crashing', () => {
    const key = crypto.keys.unmarshalPublicKey(fixtures.verify.publicKey)
    testGarbage.doTests('key.verify', key.verify.bind(key), 2)
    testGarbage.doTests('crypto.keys.unmarshalPrivateKey', crypto.keys.unmarshalPrivateKey.bind(crypto.keys))
  })

  describe('go interop', () => {
    let privateKey

    before((done) => {
      crypto.keys.unmarshalPrivateKey(fixtures.verify.privateKey, (err, key) => {
        expect(err).to.not.exist()
        privateKey = key
        done()
      })
    })

    it('verifies with data from go', (done) => {
      const key = crypto.keys.unmarshalPublicKey(fixtures.verify.publicKey)

      key.verify(fixtures.verify.data, fixtures.verify.signature, (err, ok) => {
        expect(err).to.not.exist()
        expect(ok).to.eql(true)
        done()
      })
    })

    it('generates the same signature as go', (done) => {
      privateKey.sign(fixtures.verify.data, (err, sig) => {
        expect(err).to.not.exist()
        expect(sig).to.eql(fixtures.verify.signature)
        done()
      })
    })
  })
})
