/* eslint-disable no-console */
const crypto = require('../dist/src/index.js')

const Benchmark = require('benchmark')

const suite = new Benchmark.Suite('ephemeral-keys')

const secrets = []
const curves = ['P-256', 'P-384', 'P-521']

curves.forEach((curve) => {
  suite.add(`ephemeral key with secrect ${curve}`, async (d) => {
    const res = await crypto.keys.generateEphemeralKeyPair('P-256')
    const secret = await res.genSharedKey(res.key)
    secrets.push(secret)
    d.resolve()
  }, { defer: true })
})

suite
  .on('cycle', (event) => console.log(String(event.target)))
  .run({ async: true })
