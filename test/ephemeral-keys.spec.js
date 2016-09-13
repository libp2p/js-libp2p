/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const expect = require('chai').expect
const crypto = require('../src')
const fixtures = require('./fixtures/go-elliptic-key')

const curves = ['P-256', 'P-384', 'P-521']
// const lengths = {
//   'P-256': 32,
//   'P-384': 48,
//   'P-521': 65
// }

describe('generateEphemeralKeyPair', () => {
  curves.forEach((curve) => {
    it(`generate and shared key ${curve}`, (done) => {
      crypto.generateEphemeralKeyPair(curve, (err, ours) => {
        if (err) {
          return done(err)
        }

        crypto.generateEphemeralKeyPair(curve, (err, theirs) => {
          if (err) {
            return done(err)
          }

          ours.genSharedKey(theirs.key, (err, shared) => {
            if (err) {
              return done(err)
            }

            expect(shared).to.exist
            // expect(shared).to.have.length(lengths[curve])
            expect(ours.key).to.exist
            done()
          })
        })
      })
    })
  })

  describe.skip('go interop', () => {
    it('generates a shared secret', (done) => {
      const curve = fixtures.curve
      console.log('start', curve)
      // crypto.webcrypto.subtle.importKey(
      //   'pkcs8',
      //   Uint8Array.from(fixtures.bob.private),
      //   {
      //     name: 'ECDH',
      //     namedCurve: curve
      //   },
      //   false,
      //   ['deriveBits']
      // ).then((bobPrivate) => {
      //   console.log('imported bobs key')
      //   checkKeys(bobPrivate)
      // }).catch((err) => {
      //   done(err)
      // })
      checkKeys()
      function checkKeys (bobPrivate) {
        crypto.generateEphemeralKeyPair(curve, (err, alice) => {
          if (err) {
            return done(err)
          }
          console.log('genreated ephem pair')
          const bob = {
            key: fixtures.bob.public,
            // this is using bobs private key from go ipfs
            // instead of alices
            genSharedKey: (key, cb) => alice.genSharedKey(key, bobPrivate, cb)
          }

          alice.genSharedKey(bob.key, (err, s1) => {
            if (err) {
              return done(err)
            }
            console.log('genshared alice')
            bob.genSharedKey(alice.key, (err, s2) => {
              if (err) {
                return done(err)
              }
              console.log('genshared bob')
              expect(s1.equals(s2)).to.be.eql(true)
              done()
            })
          })
        })
      }
    })
  })
})
