'use strict'

const test1 from './test-1')
const test2 from './test-2')
const test3 from './test-3')
const test4 from './test-4')

async function test() {
  await test1()
  await test2()
  await test3()
  await test4()
}

module.exports = test
