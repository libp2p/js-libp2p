'use strict'

const test1 from './test-1')
const testMessageFiltering from './message-filtering/test')

async function test() {
  await test1()
  await testMessageFiltering()
}

module.exports = test
