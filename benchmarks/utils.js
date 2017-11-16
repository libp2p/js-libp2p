/* global self */
'use strict'

const Benchmark = require('benchmark')

if (typeof self !== 'undefined') {
  self.Benchmark = Benchmark
}

const utils = require('../src/utils')

const suite = new Benchmark.Suite('utils')

let res = []

suite.add('randomSeqno', () => {
  res.push(utils.randomSeqno())
})

suite
  .on('cycle', (event) => {
    console.log(String(event.target))
    res = []
  })
  .run({
    async: true
  })
