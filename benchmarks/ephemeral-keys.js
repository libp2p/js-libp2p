/* eslint-disable no-console */
'use strict'

const Benchmark = require('benchmark')
const crypto = require('../src')

const suite = new Benchmark.Suite('ephemeral-keys')

const secrets = []
const curves = ['P-256', 'P-384', 'P-521']

curves.forEach((curve) => {
  suite.add(`ephemeral key with secrect ${curve}`, (d) => {
    crypto.keys.generateEphemeralKeyPair('P-256', (err, res) => {
      if (err) { throw err }
      res.genSharedKey(res.key, (err, secret) => {
        if (err) { throw err }
        secrets.push(secret)

        d.resolve()
      })
    })
  }, { defer: true })
})

suite
  .on('cycle', (event) => console.log(String(event.target)))
  .run({async: true})
