'use strict'

const path = require('path')
const execa = require('execa')
const pDefer = require('p-defer')
const uint8ArrayToString = require('uint8arrays/to-string')

async function test () {
  const deferNode1 = pDefer()
  const deferNode2 = pDefer()
  const deferNode3 = pDefer()

  process.stdout.write('3.js\n')

  const proc = execa('node', [path.join(__dirname, '3.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    const line = uint8ArrayToString(data)

    if (line.includes('node 1 dialed to node 2 successfully')) {
      deferNode1.resolve()
    } else if (line.includes('node 2 dialed to node 3 successfully')) {
      deferNode2.resolve()
    } else if (line.includes('node 3 failed to dial to node 1 with:')) {
      deferNode3.resolve()
    }
  })

  await Promise.all([
    deferNode1.promise,
    deferNode2.promise,
    deferNode3.promise
  ])
  proc.kill()
}

module.exports = test
