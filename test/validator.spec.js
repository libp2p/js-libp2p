/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const crypto = require('libp2p-crypto')
const PeerId = require('peer-id')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const libp2pRecord = require('../src')
const validator = libp2pRecord.validator
const Record = libp2pRecord.Record

const fixture = require('./fixtures/go-key-records.js')

const generateCases = (hash) => {
  return {
    valid: {
      publicKey: [
        Uint8Array.of(
          ...uint8ArrayFromString('/pk/'),
          ...hash
        )
      ]
    },
    invalid: {
      publicKey: [
        // missing hashkey
        [uint8ArrayFromString('/pk/'), 'ERR_INVALID_RECORD_KEY_TOO_SHORT'],
        // not the hash of a key
        [Uint8Array.of(...uint8ArrayFromString('/pk/'),
          ...uint8ArrayFromString('random')
        ), 'ERR_INVALID_RECORD_HASH_MISMATCH'],
        // missing prefix
        [hash, 'ERR_INVALID_RECORD_KEY_BAD_PREFIX'],
        // not a buffer
        ['not a buffer', 'ERR_INVALID_RECORD_KEY_NOT_BUFFER']
      ]
    }
  }
}

describe('validator', () => {
  let key
  let hash
  let cases

  before(async () => {
    key = await crypto.keys.generateKeyPair('rsa', 1024)
    hash = await key.public.hash()
    cases = generateCases(hash)
  })

  describe('verifyRecord', () => {
    it('calls matching validator', () => {
      const k = uint8ArrayFromString('/hello/you')
      const rec = new Record(k, uint8ArrayFromString('world'), new PeerId(hash))

      const validators = {
        hello: {
          func (key, value) {
            expect(key).to.eql(k)
            expect(value).to.eql(uint8ArrayFromString('world'))
          },
          sign: false
        }
      }
      return validator.verifyRecord(validators, rec)
    })

    it('calls not matching any validator', () => {
      const k = uint8ArrayFromString('/hallo/you')
      const rec = new Record(k, uint8ArrayFromString('world'), new PeerId(hash))

      const validators = {
        hello: {
          func (key, value) {
            expect(key).to.eql(k)
            expect(value).to.eql(uint8ArrayFromString('world'))
          },
          sign: false
        }
      }
      return expect(
        () => validator.verifyRecord(validators, rec)
      ).to.throw(
        /Invalid record keytype/
      )
    })
  })

  describe('validators', () => {
    it('exports pk', () => {
      expect(validator.validators).to.have.keys(['pk'])
    })

    describe('public key', () => {
      it('exports func and sign', () => {
        const pk = validator.validators.pk

        expect(pk).to.have.property('func')
        expect(pk).to.have.property('sign', false)
      })

      it('does not error on valid record', () => {
        return Promise.all(cases.valid.publicKey.map((k) => {
          return validator.validators.pk.func(k, key.public.bytes)
        }))
      })

      it('throws on invalid records', () => {
        return Promise.all(cases.invalid.publicKey.map(async ([k, errCode]) => {
          try {
            await validator.validators.pk.func(k, key.public.bytes)
          } catch (err) {
            expect(err.code).to.eql(errCode)
            return
          }
          expect.fail('did not throw an error with code ' + errCode)
        }))
      })
    })
  })

  describe('go interop', () => {
    it('record with key from from go', async () => {
      const pubKey = crypto.keys.unmarshalPublicKey(fixture.publicKey)

      const hash = await pubKey.hash()
      const k = Uint8Array.of(...uint8ArrayFromString('/pk/'), ...hash)
      return validator.validators.pk.func(k, pubKey.bytes)
    })
  })
})
