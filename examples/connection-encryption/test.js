import path from 'path'
import { fileURLToPath } from 'url'
import { waitForOutput } from 'test-ipfs-example/node'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.stdout.write('1.js\n')

await waitForOutput('This information is sent out encrypted to the other peer', 'node', [path.join(__dirname, '1.js')], {
  cwd: __dirname
})
