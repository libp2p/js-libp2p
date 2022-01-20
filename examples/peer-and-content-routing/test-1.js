'use strict'

const path = require('path')
const execa = require('execa')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

async function test() {
  process.stdout.write('1.js\n')

  const proc = execa('node', [path.join(__dirname, '1.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  let contents = ''

  proc.all.on('data', async (data) => {
    process.stdout.write(data)

    contents += uint8ArrayToString(data)

    // Discovered peer
    if (contents.includes('Found it, multiaddrs are:')) {
      proc.kill()
    }
  })
}

module.exports = test
