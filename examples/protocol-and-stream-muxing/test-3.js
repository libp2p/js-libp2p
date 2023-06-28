import path from 'path'
import { fileURLToPath } from 'url'
import { waitForOutput } from 'test-ipfs-example/node'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function test () {
  process.stdout.write('3.js\n')

  await waitForOutput('from 2 to 1', 'node', [path.join(__dirname, '3.js')], {
    cwd: __dirname
  })
}
