'use strict'

import path from 'path'
const { waitForOutput } from '../utils')

async function test () {
  process.stdout.write('2.js\n')

  await waitForOutput('Found provider:', 'node', [path.join(__dirname, '2.js')], {
    cwd: __dirname
  })
}

module.exports = test
