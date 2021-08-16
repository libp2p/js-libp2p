'use strict'

const path = require('path')
const execa = require('execa')
const pDefer = require('p-defer')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

async function test () {
  const deferStarted = pDefer()
  const deferListen = pDefer()

  process.stdout.write('1.js\n')

  const proc = execa('node', [path.join(__dirname, '1.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    const line = uint8ArrayToString(data)


    if (line.includes('node has started (true/false): true')) {
      deferStarted.resolve()
    } else if (line.includes('p2p')) {
      deferListen.resolve()
    }
  })

  await Promise.all([
    deferStarted.promise,
    deferListen.promise
  ])
  proc.kill()
}

module.exports = test
