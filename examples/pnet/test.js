'use strict'

const path = require('path')
const execa = require('execa')
const pDefer = require('p-defer')
const uint8ArrayToString = require('uint8arrays/to-string')

async function test () {
  const messageReceived = pDefer()
  process.stdout.write('index.js\n')

  const proc = execa('node', [path.join(__dirname, 'index.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)

    const s = uint8ArrayToString(data)
    if (s.includes('This message is sent on a private network')) {
      messageReceived.resolve()
    }
  })

  await messageReceived.promise
  proc.kill()
}

module.exports = test
