'use strict'

const path = require('path')
const execa = require('execa')
const pDefer = require('p-defer')
const uint8ArrayToString = require('uint8arrays/to-string')

async function test () {
  const messageReceived = pDefer()
  process.stdout.write('1.js\n')

  const proc = execa('node', [path.join(__dirname, '1.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)

    const s = uint8ArrayToString(data)
    if (s.includes('This information is sent out encrypted to the other peer')) {
      messageReceived.resolve()
    }
  })

  await messageReceived.promise
  proc.kill()
}

module.exports = test
