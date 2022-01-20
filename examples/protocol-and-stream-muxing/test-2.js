'use strict'

const path = require('path')
const { waitForOutput } = require('../utils')

async function test () {
  process.stdout.write('2.js\n')

  await waitForOutput('another stream on protocol (b)', 'node', [path.join(__dirname, '2.js')], {
    cwd: __dirname
  })
}

module.exports = test
