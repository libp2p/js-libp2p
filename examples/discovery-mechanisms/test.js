'use strict'

const test1 = require('./test-1')
const test2 = require('./test-2')
const test3 = require('./test-3')
const testRendezvous = require('./rendezvous/test')

async function test () {
  await test1()
  await test2()
  await test3()
  await testRendezvous()
}

module.exports = test
