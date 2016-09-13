'use strict'

const Benchmark = require('benchmark')
const crypto = require('../src')

const suite = new Benchmark.Suite('key-stretcher')

const keys = []

const ciphers = ['AES-128', 'AES-256', 'Blowfish']
const hashes = ['SHA1', 'SHA256', 'SHA512']

crypto.generateEphemeralKeyPair('P-256', (err, res) => {
  if (err) throw err

  res.genSharedKey(res.key, (err, secret) => {
    if (err) throw err
    ciphers.forEach((cipher) => {
      hashes.forEach((hash) => {
        suite.add(`keyStretcher ${cipher} ${hash}`, (d) => {
          crypto.keyStretcher(cipher, hash, secret, (err, k) => {
            if (err) {
              throw err
            }

            keys.push(k)
            d.resolve()
          })
        }, {
          defer: true
        })
      })
    })

    suite
      .on('cycle', (event) => {
        console.log(String(event.target))
      })
      .run({
        'async': true
      })
  })
})
