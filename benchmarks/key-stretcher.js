'use strict'

const Benchmark = require('benchmark')
const async = require('async')

const crypto = require('../src')

const suite = new Benchmark.Suite('key-stretcher')

const keys = []

const ciphers = ['AES-128', 'AES-256', 'Blowfish']
const hashes = ['SHA1', 'SHA256', 'SHA512']

async.waterfall([
  (cb) => crypto.keys.generateEphemeralKeyPair('P-256', cb),
  (res, cb) => res.genSharedKey(res.key, cb)
], (err, secret) => {
  if (err) { throw err }

  ciphers.forEach((cipher) => hashes.forEach((hash) => {
    setup(cipher, hash, secret)
  }))

  suite
    .on('cycle', (event) => console.log(String(event.target)))
    .run({async: true})
})

function setup (cipher, hash, secret) {
  suite.add(`keyStretcher ${cipher} ${hash}`, (d) => {
    crypto.keys.keyStretcher(cipher, hash, secret, (err, k) => {
      if (err) { throw err }

      keys.push(k)
      d.resolve()
    })
  }, { defer: true })
}
