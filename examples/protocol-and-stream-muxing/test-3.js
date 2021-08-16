'use strict'

const path = require('path')
const execa = require('execa')
const pWaitFor = require('p-wait-for')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

const messages = [
  'from 1 to 2',
  'from 2 to 1'
]

async function test() {
  process.stdout.write('3.js\n')

  let count = 0
  const proc = execa('node', [path.join(__dirname, '3.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)

    const line = uint8ArrayToString(data)

    if (messages.find((m) => line.includes(m))) {
      count += 1
    }
  })

  await pWaitFor(() => count === messages.length)

  proc.kill()
}

module.exports = test
