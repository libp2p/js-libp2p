import path from 'path'
import { waitForOutput } from '../utils.js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function test () {
  process.stdout.write('3.js\n')

  await waitForOutput('node 3 failed to dial to node 1 with:', 'node', [path.join(__dirname, '3.js')], {
    cwd: __dirname
  })
}
