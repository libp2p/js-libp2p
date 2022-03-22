
process.on('unhandedRejection', (err) => {
  console.error(err)

  process.exit(1)
})

import path from 'path'
import fs from 'fs'
import {
  waitForOutput
} from './utils.js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function testAll () {
  for (const dir of fs.readdirSync(__dirname)) {
    if (dir === 'node_modules' || dir === 'tests_output') {
      continue
    }

    const stats = fs.statSync(path.join(__dirname, dir))

    if (!stats.isDirectory()) {
      continue
    }

    await waitForOutput('npm info ok', 'npm', ['--loglevel', 'info', 'run', 'test', '--', dir], {
      cwd: __dirname
    })
  }
}

testAll()
