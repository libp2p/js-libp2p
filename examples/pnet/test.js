'use strict'

const path = require('path')
const { waitForOutput } = require('../utils')

async function test () {
  await waitForOutput('This message is sent on a private network', 'node', [path.join(__dirname, 'index.js')], {
    cwd: __dirname
  })
}

module.exports = test

