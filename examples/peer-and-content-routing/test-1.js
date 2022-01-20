'use strict'

const path = require('path')
const execa = require('execa')
const pWaitFor = require('p-wait-for')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

async function test() {
  process.stdout.write('1.js\n')

  const addrs = []
  let foundIt = false
  const proc = execa('node', [path.join(__dirname, '1.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)

    const line = uint8ArrayToString(data)

    // Discovered peer
    if (!foundIt && line.includes('Found it, multiaddrs are:')) {
      foundIt = true
    }

    addrs.push(line)
  })

  await pWaitFor(() => addrs.length === 2)

  process.stdout.write('kill process\n')
  proc.kill()
}

module.exports = test
