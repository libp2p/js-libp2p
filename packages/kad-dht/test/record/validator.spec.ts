/* eslint max-nested-callbacks: ["error", 8] */
import { generateKeyPair, publicKeyFromProtobuf, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { Libp2pRecord } from '@libp2p/record'
import { expect } from 'aegir/chai'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as validator from '../../src/record/validators.js'
import * as fixture from '../fixtures/record/go-key-records.js'
import type { Validators } from '../../src/index.js'
import type { RSAPrivateKey } from '@libp2p/interface'

interface Cases {
  valid: {
    publicKey: Uint8Array[]
  }
  invalid: {
    publicKey: Uint8Array[]
  }
}

const generateCases = (hash: Uint8Array): Cases => {
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
        uint8ArrayFromString('/pk/'),
        Uint8Array.of(...uint8ArrayFromString('/pk/'), ...uint8ArrayFromString('random')),
        hash,
        // @ts-expect-error invalid input
        'not a buffer'
      ]
    }
  }
}

describe('validator', () => {
  let key: RSAPrivateKey
  let hash: Uint8Array
  let cases: Cases

  before(async () => {
    key = await generateKeyPair('RSA', 1024)
    hash = key.publicKey.toMultihash().bytes
    cases = generateCases(hash)
  })

  describe('verifyRecord', () => {
    it('calls matching validator', async () => {
      const k = uint8ArrayFromString('/hello/you')
      const rec = new Libp2pRecord(k, uint8ArrayFromString('world'), new Date())

      const validators: Validators = {
        async hello (key, value) {
          expect(key).to.eql(k)
          expect(value).to.eql(uint8ArrayFromString('world'))
        }
      }
      await validator.verifyRecord(validators, rec)
    })

    it('calls not matching any validator', async () => {
      const k = uint8ArrayFromString('/hallo/you')
      const rec = new Libp2pRecord(k, uint8ArrayFromString('world'), new Date())

      const validators: Validators = {
        async hello (key, value) {
          expect(key).to.eql(k)
          expect(value).to.eql(uint8ArrayFromString('world'))
        }
      }
      await expect(validator.verifyRecord(validators, rec))
        .to.eventually.rejected.with.property('name', 'InvalidParametersError')
    })
  })

  describe('validators', () => {
    it('exports pk', () => {
      expect(validator.validators).to.have.keys(['pk'])
    })

    describe('public key', () => {
      it('exports func', () => {
        const pk = validator.validators.pk

        expect(pk).to.be.a('function')
      })

      it('does not error on valid record', async () => {
        return Promise.all(cases.valid.publicKey.map(async (k) => {
          await validator.validators.pk(k, publicKeyToProtobuf(key.publicKey))
        }))
      })

      it('throws on invalid records', async () => {
        return Promise.all(cases.invalid.publicKey.map(async data => {
          try {
            //
            await validator.validators.pk(data, publicKeyToProtobuf(key.publicKey))
          } catch (err: any) {
            expect(err).to.have.property('name', 'InvalidParametersError')
            return
          }
          expect.fail('did not throw an InvalidParametersError')
        }))
      })
    })
  })

  describe('go interop', () => {
    it('record with key from from go', async () => {
      const pubKey = publicKeyFromProtobuf(fixture.publicKey)
      const k = uint8ArrayConcat([
        uint8ArrayFromString('/pk/'),
        pubKey.toMultihash().bytes
      ])

      await validator.validators.pk(k, fixture.publicKey)
    })
  })
})
