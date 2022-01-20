'use strict'

const path = require('path')
const { waitForOutput } = require('../utils')

async function test () {
  process.stdout.write('3.js\n')

  await waitForOutput('node 3 failed to dial to node 1 with:', 'node', [path.join(__dirname, '3.js')], {
    cwd: __dirname
  })
}

module.exports = test
