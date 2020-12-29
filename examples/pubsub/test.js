'use strict'

const test1 = require('./test-1')
const testMessageFiltering = require('./message-filtering/test')

async function test() {
  await test1()
  await testMessageFiltering()
}

module.exports = test
