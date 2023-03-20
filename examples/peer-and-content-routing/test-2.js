import path from 'path'
import { waitForOutput } from '../utils.js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function test () {
  process.stdout.write('2.js\n')

  await waitForOutput('Found provider:', 'node', [path.join(__dirname, '2.js')], {
    cwd: __dirname
  })
}
