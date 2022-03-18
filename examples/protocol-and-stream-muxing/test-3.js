'use strict'

import path from 'path'
const { waitForOutput } from '../utils')

async function test () {
  process.stdout.write('3.js\n')

  await waitForOutput('from 2 to 1', 'node', [path.join(__dirname, '3.js')], {
    cwd: __dirname
  })
}

module.exports = test
