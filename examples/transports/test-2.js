'use strict'

const path = require('path')
const execa = require('execa')
const pDefer = require('p-defer')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

async function test () {
  const defer = pDefer()
  process.stdout.write('2.js\n')

  const proc = execa('node', [path.join(__dirname, '2.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    const line = uint8ArrayToString(data)

    if (line.includes('Hello p2p world!')) {
      defer.resolve()
    }
  })

  await defer.promise
  proc.kill()
}

module.exports = test
