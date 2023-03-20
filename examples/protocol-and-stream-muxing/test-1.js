import path from 'path'
import { waitForOutput } from '../utils.js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function test () {
  process.stdout.write('1.js\n')

  await waitForOutput('my own protocol, wow!', 'node', [path.join(__dirname, '1.js')], {
    cwd: __dirname
  })
}
