'use strict'

const test1 = require('./test-1')
const test2 = require('./test-2')

async function test() {
  console.info('start test 1')
  await test1()
  console.info('start test 2')
  await test2()
  console.info('tests done')
}

module.exports = test
