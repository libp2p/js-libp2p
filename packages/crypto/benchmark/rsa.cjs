/* eslint-disable no-console */
const crypto = require('../dist/src/index.js')

const Benchmark = require('benchmark')

const suite = new Benchmark.Suite('rsa')

const keys = []
const bits = [1024, 2048, 4096]

bits.forEach((bit) => {
  suite.add(`generateKeyPair ${bit}bits`, async (d) => {
    const key = await crypto.keys.generateKeyPair('RSA', bit)
    keys.push(key)
    d.resolve()
  }, {
    defer: true
  })
})

suite.add('sign and verify', async (d) => {
  const key = keys[0]
  const text = key.genSecret()

  const sig = await key.sign(text)
  const res = await key.public.verify(text, sig)

  if (res !== true) { throw new Error('failed to verify') }
  d.resolve()
}, {
  defer: true
})

suite
  .on('cycle', (event) => console.log(String(event.target)))
  .run({ async: true })
