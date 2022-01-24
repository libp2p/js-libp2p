'use strict'

const path = require('path')
const { waitForOutput } = require('../utils')

async function test () {
  process.stdout.write('2.js\n')

  await waitForOutput('Hello p2p world!', 'node', [path.join(__dirname, '2.js')], {
    cwd: __dirname
  })
}

module.exports = test
