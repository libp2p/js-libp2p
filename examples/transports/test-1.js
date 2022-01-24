'use strict'

const path = require('path')
const { waitForOutput } = require('../utils')

async function test () {
  process.stdout.write('1.js\n')

  await waitForOutput('/p2p/', 'node', [path.join(__dirname, '1.js')], {
    cwd: __dirname
  })
}

module.exports = test
