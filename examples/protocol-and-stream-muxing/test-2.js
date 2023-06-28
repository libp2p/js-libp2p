import path from 'path'
import { fileURLToPath } from 'url'
import { waitForOutput } from 'test-ipfs-example/node'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function test () {
  process.stdout.write('2.js\n')

  await waitForOutput('another stream on protocol (b)', 'node', [path.join(__dirname, '2.js')], {
    cwd: __dirname
  })
}
