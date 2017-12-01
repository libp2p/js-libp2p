/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const crypto = require('../../src')
const rsa = crypto.keys.supportedKeys.rsa
const fixtures = require('../fixtures/go-key-rsa')

const testGarbage = require('../helpers/test-garbage-error-handling')

describe('RSA', function () {
  this.timeout(20 * 1000)
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

  it('generates a valid key', (done) => {
    expect(key).to.be.an.instanceof(rsa.RsaPrivateKey)

    key.hash((err, digest) => {
      if (err) {
        return done(err)
      }

      expect(digest).to.have.length(34)
      done()
    })
  })

  it('signs', (done) => {
    const text = key.genSecret()

    key.sign(text, (err, sig) => {
      if (err) {
        return done(err)
      }

      key.public.verify(text, sig, (err, res) => {
        if (err) {
          return done(err)
        }

        expect(res).to.be.eql(true)
        done()
      })
    })
  })

  it('encoding', (done) => {
    const keyMarshal = key.marshal()
    rsa.unmarshalRsaPrivateKey(keyMarshal, (err, key2) => {
      if (err) {
        return done(err)
      }
      const keyMarshal2 = key2.marshal()

      expect(keyMarshal).to.eql(keyMarshal2)

      const pk = key.public
      const pkMarshal = pk.marshal()
      const pk2 = rsa.unmarshalRsaPublicKey(pkMarshal)
      const pkMarshal2 = pk2.marshal()

      expect(pkMarshal).to.eql(pkMarshal2)
      done()
    })
  })

  describe('key equals', () => {
    it('equals itself', () => {
      expect(key.equals(key)).to.eql(true)

      expect(key.public.equals(key.public)).to.eql(true)
    })

    it('not equals other key', (done) => {
      crypto.keys.generateKeyPair('RSA', 2048, (err, key2) => {
        if (err) {
          return done(err)
        }

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
        expect(valid).to.be.eql(true)
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
    testGarbage.doTests('key.verify', key.verify.bind(key), 2, true)
    testGarbage.doTests('crypto.keys.unmarshalPrivateKey', crypto.keys.unmarshalPrivateKey.bind(crypto.keys))
  })

  describe('go interop', () => {
    it('verifies with data from go', (done) => {
      const key = crypto.keys.unmarshalPublicKey(fixtures.verify.publicKey)

      key.verify(fixtures.verify.data, fixtures.verify.signature, (err, ok) => {
        if (err) throw err
        expect(err).to.not.exist()
        expect(ok).to.equal(true)
        done()
      })
    })
  })
})
