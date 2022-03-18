'use strict'

import path from 'path'
const { waitForOutput } from '../utils')

async function test () {
  process.stdout.write('4.js\n')

  await waitForOutput('node 2 dialed to node 1 successfully', 'node', [path.join(__dirname, '4.js')], {
    cwd: __dirname
  })
}

module.exports = test
