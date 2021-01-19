'use strict'

const test1 = require('./test-1')
const test2 = require('./test-2')

async function test () {
  await test1()
  await test2()
}

module.exports = test
