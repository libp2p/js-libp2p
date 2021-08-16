'use strict'

const path = require('path')
const execa = require('execa')
const pDefer = require('p-defer')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

async function test () {
  const deferNode1 = pDefer()

  process.stdout.write('4.js\n')

  const proc = execa('node', [path.join(__dirname, '4.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    const line = uint8ArrayToString(data)

    if (line.includes('node 2 dialed to node 1 successfully')) {
      deferNode1.resolve()
    }
  })

  await Promise.all([
    deferNode1.promise,
  ])
  proc.kill()
}

module.exports = test
