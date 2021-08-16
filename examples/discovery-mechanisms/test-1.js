'use strict'

const path = require('path')
const execa = require('execa')
const pWaitFor = require('p-wait-for')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')
const bootstrapers = require('./bootstrapers')

const discoveredCopy = 'Discovered:'
const connectedCopy = 'Connection established to:'

async function test () {
  const discoveredNodes = []
  const connectedNodes = []

  process.stdout.write('1.js\n')

  const proc = execa('node', [path.join(__dirname, '1.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    const line = uint8ArrayToString(data)

    // Discovered or Connected
    if (line.includes(discoveredCopy)) {
      const id = line.trim().split(discoveredCopy)[1]
      discoveredNodes.push(id)
    } else if (line.includes(connectedCopy)) {
      const id = line.trim().split(connectedCopy)[1]
      connectedNodes.push(id)
    }
  })

  await pWaitFor(() => discoveredNodes.length === bootstrapers.length && connectedNodes.length === bootstrapers.length)

  proc.kill()
}

module.exports = test
