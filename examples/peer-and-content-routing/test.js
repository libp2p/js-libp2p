'use strict'

const test1 from './test-1')
const test2 from './test-2')

async function test() {
  await test1()
  await test2()
}

module.exports = test
