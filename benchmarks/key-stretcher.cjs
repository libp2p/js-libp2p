/* eslint-disable no-console */
const crypto = require('../src')

const Benchmark = require('benchmark')

const suite = new Benchmark.Suite('key-stretcher')

const keys = []

const ciphers = ['AES-128', 'AES-256', 'Blowfish']
const hashes = ['SHA1', 'SHA256', 'SHA512']

;(async () => {
  const res = await crypto.keys.generateEphemeralKeyPair('P-256')
  const secret = await res.genSharedKey(res.key)

  ciphers.forEach((cipher) => hashes.forEach((hash) => {
    setup(cipher, hash, secret)
  }))

  suite
    .on('cycle', (event) => console.log(String(event.target)))
    .run({ async: true })
})()

function setup (cipher, hash, secret) {
  suite.add(`keyStretcher ${cipher} ${hash}`, async (d) => {
    const k = await crypto.keys.keyStretcher(cipher, hash, secret)
    keys.push(k)
    d.resolve()
  }, { defer: true })
}
