/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const series = require('async/series')
const Buffer = require('safe-buffer').Buffer

const crypto = require('../../src')
const fixtures = require('./../fixtures/aes')
const goFixtures = require('./../fixtures/go-aes')

const bytes = {
  16: 'AES-128',
  32: 'AES-256'
}

describe('AES-CTR', () => {
  Object.keys(bytes).forEach((byte) => {
    it(`${bytes[byte]} - encrypt and decrypt`, (done) => {
      const key = Buffer.alloc(parseInt(byte, 10))
      key.fill(5)

      const iv = Buffer.alloc(16)
      iv.fill(1)

      crypto.aes.create(key, iv, (err, cipher) => {
        expect(err).to.not.exist()

        series([
          encryptAndDecrypt(cipher),
          encryptAndDecrypt(cipher),
          encryptAndDecrypt(cipher),
          encryptAndDecrypt(cipher),
          encryptAndDecrypt(cipher)
        ], done)
      })
    })
  })

  Object.keys(bytes).forEach((byte) => {
    it(`${bytes[byte]} - fixed - encrypt and decrypt`, (done) => {
      const key = Buffer.alloc(parseInt(byte, 10))
      key.fill(5)

      const iv = Buffer.alloc(16)
      iv.fill(1)

      crypto.aes.create(key, iv, (err, cipher) => {
        expect(err).to.not.exist()

        series(fixtures[byte].inputs.map((rawIn, i) => (cb) => {
          const input = Buffer.from(rawIn)
          const output = Buffer.from(fixtures[byte].outputs[i])
          cipher.encrypt(input, (err, res) => {
            expect(err).to.not.exist()
            expect(res).to.have.length(output.length)
            expect(res).to.eql(output)
            cipher.decrypt(res, (err, res) => {
              expect(err).to.not.exist()
              expect(res).to.eql(input)
              cb()
            })
          })
        }), done)
      })
    })
  })

  Object.keys(bytes).forEach((byte) => {
    if (!goFixtures[byte]) {
      return
    }

    it(`${bytes[byte]} - go interop - encrypt and decrypt`, (done) => {
      const key = Buffer.alloc(parseInt(byte, 10))
      key.fill(5)

      const iv = Buffer.alloc(16)
      iv.fill(1)

      crypto.aes.create(key, iv, (err, cipher) => {
        expect(err).to.not.exist()

        series(goFixtures[byte].inputs.map((rawIn, i) => (cb) => {
          const input = Buffer.from(rawIn)
          const output = Buffer.from(goFixtures[byte].outputs[i])
          cipher.encrypt(input, (err, res) => {
            expect(err).to.not.exist()
            expect(res).to.have.length(output.length)
            expect(res).to.be.eql(output)
            cipher.decrypt(res, (err, res) => {
              expect(err).to.not.exist()
              expect(res).to.be.eql(input)
              cb()
            })
          })
        }), done)
      })
    })
  })
})

function encryptAndDecrypt (cipher) {
  const data = Buffer.alloc(100)
  data.fill(Math.ceil(Math.random() * 100))
  return (cb) => {
    cipher.encrypt(data, (err, res) => {
      expect(err).to.not.exist()
      cipher.decrypt(res, (err, res) => {
        expect(err).to.not.exist()
        expect(res).to.be.eql(data)
        cb()
      })
    })
  }
}
