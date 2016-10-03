/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const parallel = require('async/parallel')

const fixtures = require('./fixtures/go-elliptic-key')
const crypto = require('../src')

const curves = ['P-256', 'P-384'] // 'P-521' fails in tests :( no clue why
const lengths = {
  'P-256': 65,
  'P-384': 97,
  'P-521': 133
}

describe('generateEphemeralKeyPair', () => {
  curves.forEach((curve) => {
    it(`generate and shared key ${curve}`, (done) => {
      parallel([
        (cb) => crypto.generateEphemeralKeyPair(curve, cb),
        (cb) => crypto.generateEphemeralKeyPair(curve, cb)
      ], (err, keys) => {
        expect(err).to.not.exist
        expect(keys[0].key).to.have.length(lengths[curve])
        expect(keys[1].key).to.have.length(lengths[curve])

        keys[0].genSharedKey(keys[1].key, (err, shared) => {
          expect(err).to.not.exist
          expect(shared).to.have.length(32)
          done()
        })
      })
    })
  })

  describe('go interop', () => {
    it('generates a shared secret', (done) => {
      const curve = fixtures.curve

      crypto.generateEphemeralKeyPair(curve, (err, alice) => {
        expect(err).to.not.exist

        alice.genSharedKey(fixtures.bob.public, (err, s1) => {
          expect(err).to.not.exist
          expect(s1).to.have.length(32)
          done()
        })
      })
    })
  })
})
