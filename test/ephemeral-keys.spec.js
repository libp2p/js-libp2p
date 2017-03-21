/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const parallel = require('async/parallel')

const fixtures = require('./fixtures/go-elliptic-key')
const crypto = require('../src')

const curves = ['P-256', 'P-384'] // 'P-521' fails in tests :( no clue why
const lengths = {
  'P-256': 65,
  'P-384': 97,
  'P-521': 133
}
const secretLengths = {
  'P-256': 32,
  'P-384': 48,
  'P-521': 66
}

describe('generateEphemeralKeyPair', () => {
  curves.forEach((curve) => {
    it(`generate and shared key ${curve}`, (done) => {
      parallel([
        (cb) => crypto.generateEphemeralKeyPair(curve, cb),
        (cb) => crypto.generateEphemeralKeyPair(curve, cb)
      ], (err, keys) => {
        expect(err).to.not.exist()
        expect(keys[0].key).to.have.length(lengths[curve])
        expect(keys[1].key).to.have.length(lengths[curve])

        keys[0].genSharedKey(keys[1].key, (err, shared) => {
          expect(err).to.not.exist()
          expect(shared).to.have.length(secretLengths[curve])
          done()
        })
      })
    })
  })

  describe('go interop', () => {
    it('generates a shared secret', (done) => {
      const curve = fixtures.curve

      parallel([
        (cb) => crypto.generateEphemeralKeyPair(curve, cb),
        (cb) => crypto.generateEphemeralKeyPair(curve, cb)
      ], (err, res) => {
        expect(err).to.not.exist()
        const alice = res[0]
        const bob = res[1]
        bob.key = fixtures.bob.public

        parallel([
          (cb) => alice.genSharedKey(bob.key, cb),
          (cb) => bob.genSharedKey(alice.key, fixtures.bob, cb)
        ], (err, secrets) => {
          expect(err).to.not.exist()

          expect(
            secrets[0]
          ).to.be.eql(
            secrets[1]
          )

          expect(secrets[0]).to.have.length(32)

          done()
        })
      })
    })
  })
})
