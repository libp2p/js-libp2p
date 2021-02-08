'use strict'

const path = require('path')
const execa = require('execa')
const pDefer = require('p-defer')
const uint8ArrayToString = require('uint8arrays/to-string')

const providedCopy = 'is providing'
const foundCopy = 'Found provider:'

async function test() {
  process.stdout.write('2.js\n')
  const providedDefer = pDefer()
  const foundDefer = pDefer()

  const proc = execa('node', [path.join(__dirname, '2.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)

    const line = uint8ArrayToString(data)

    if (line.includes(providedCopy)) {
      providedDefer.resolve()
    } else if (line.includes(foundCopy)) {
      foundDefer.resolve()
    }
  })

  await Promise.all([
    providedDefer.promise,
    foundDefer.promise
  ])
  proc.kill()
}

module.exports = test
