'use strict'

const test1 = require('./test-1')
const test2 = require('./test-2')
const test3 = require('./test-3')

async function test() {
  await test1()
  await test2()
  await test3()
}

module.exports = test
