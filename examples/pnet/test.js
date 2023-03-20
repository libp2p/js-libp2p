import path from 'path'
import { waitForOutput } from '../utils.js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function test () {
  await waitForOutput('This message is sent on a private network', 'node', [path.join(__dirname, 'index.js')], {
    cwd: __dirname
  })
}

