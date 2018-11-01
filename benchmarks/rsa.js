/* eslint-disable no-console */
'use strict'

const Benchmark = require('benchmark')
const crypto = require('../src')

const suite = new Benchmark.Suite('rsa')

const keys = []
const bits = [1024, 2048, 4096]

bits.forEach((bit) => {
  suite.add(`generateKeyPair ${bit}bits`, (d) => {
    crypto.keys.generateKeyPair('RSA', bit, (err, key) => {
      if (err) { throw err }
      keys.push(key)
      d.resolve()
    })
  }, {
    defer: true
  })
})

suite.add('sign and verify', (d) => {
  const key = keys[0]
  const text = key.genSecret()

  key.sign(text, (err, sig) => {
    if (err) { throw err }

    key.public.verify(text, sig, (err, res) => {
      if (err) { throw err }
      if (res !== true) { throw new Error('failed to verify') }
      d.resolve()
    })
  })
}, {
  defer: true
})

suite
  .on('cycle', (event) => console.log(String(event.target)))
  .run({async: true})
