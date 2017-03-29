/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const waterfall = require('async/waterfall')
const each = require('async/each')
const crypto = require('libp2p-crypto')
const PeerId = require('peer-id')

const libp2pRecord = require('../src')
const validator = libp2pRecord.validator
const Record = libp2pRecord.Record

const fixture = require('./fixtures/go-key-records.js')

const generateCases = (hash) => {
  return {
    valid: {
      publicKey: [
        Buffer.concat([
          new Buffer('/pk/'),
          hash
        ])
      ]
    },
    invalid: {
      publicKey: [
        // missing hashkey
        new Buffer('/pk/'),
        // not the hash of a key
        Buffer.concat([
          new Buffer('/pk/'),
          new Buffer('random')
        ]),
        // missing prefix
        hash
      ]
    }
  }
}

describe('validator', () => {
  let key
  let hash
  let cases

  before((done) => {
    waterfall([
      (cb) => crypto.generateKeyPair('rsa', 1024, cb),
      (pair, cb) => {
        key = pair
        pair.public.hash(cb)
      },
      (_hash, cb) => {
        hash = _hash
        cases = generateCases(hash)
        cb()
      }
    ], done)
  })

  describe('verifyRecord', () => {
    it('calls matching validator', (done) => {
      const k = new Buffer('/hello/you')
      const rec = new Record(k, new Buffer('world'), new PeerId(hash))

      const validators = {
        hello: {
          func (key, value, cb) {
            expect(key).to.be.eql(k)
            expect(value).to.be.eql(new Buffer('world'))
            cb()
          },
          sign: false
        }
      }
      validator.verifyRecord(validators, rec, done)
    })
  })

  describe('isSigned', () => {
    it('returns false for missing validator', () => {
      const validators = {}

      expect(
        validator.isSigned(validators, new Buffer('/hello'))
      ).to.be.eql(
        false
      )
    })

    it('throws on unkown validator', () => {
      const validators = {}

      expect(
        () => validator.isSigned(validators, new Buffer('/hello/world'))
      ).to.throw(
          /Invalid record keytype/
      )
    })

    it('returns the value from the matching validator', () => {
      const validators = {
        hello: {sign: true},
        world: {sign: false}
      }

      expect(
        validator.isSigned(validators, new Buffer('/hello/world'))
      ).to.be.eql(
        true
      )

      expect(
        validator.isSigned(validators, '/world/hello')
      ).to.be.eql(
        false
      )
    })
  })

  describe('validators', () => {
    it('exports pk', () => {
      expect(validator.validators).to.have.keys(['pk'])
    })

    describe('public key', () => {
      it('exports func and sing', () => {
        const pk = validator.validators.pk

        expect(pk).to.have.property('func')
        expect(pk).to.have.property('sign', false)
      })

      it('does not error on valid record', (done) => {
        each(cases.valid.publicKey, (k, cb) => {
          validator.validators.pk.func(k, key.public.bytes, cb)
        }, done)
      })

      it('throws on invalid records', (done) => {
        each(cases.invalid.publicKey, (k, cb) => {
          validator.validators.pk.func(k, key.public.bytes, (err) => {
            expect(err).to.exist()
            cb()
          })
        }, done)
      })
    })
  })

  describe('go interop', () => {
    it('record with key from from go', (done) => {
      const pubKey = crypto.unmarshalPublicKey(fixture.publicKey)

      pubKey.hash((err, hash) => {
        expect(err).to.not.exist()
        const k = Buffer.concat([
          new Buffer('/pk/'),
          hash
        ])

        validator.validators.pk.func(k, pubKey.bytes, done)
      })
    })
  })
})
