import path from 'path'
import { waitForOutput } from '../utils.js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function test () {
  process.stdout.write('4.js\n')

  await waitForOutput('node 2 dialed to node 1 successfully', 'node', [path.join(__dirname, '4.js')], {
    cwd: __dirname
  })
}
