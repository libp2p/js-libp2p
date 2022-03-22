'use strict'

const path = require('path')
const { waitForOutput } = require('../utils')

async function test () {
  process.stdout.write('1.js\n')

  await waitForOutput('This information is sent out encrypted to the other peer', 'node', [path.join(__dirname, '1.js')], {
    cwd: __dirname
  })
}

module.exports = test
