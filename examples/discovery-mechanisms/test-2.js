'use strict'

const path = require('path')
const execa = require('execa')
const pWaitFor = require('p-wait-for')
const uint8ArrayToString = require('uint8arrays/to-string')

const discoveredCopy = 'Discovered:'

async function test() {
  const discoveredNodes = []

  process.stdout.write('2.js\n')

  const proc = execa('node', [path.join(__dirname, '2.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    const line = uint8ArrayToString(data)

    if (line.includes(discoveredCopy)) {
      const id = line.trim().split(discoveredCopy)[1]
      discoveredNodes.push(id)
    }
  })

  await pWaitFor(() => discoveredNodes.length === 2)

  proc.kill()
}

module.exports = test
