import path from 'path'
import { fileURLToPath } from 'url'
import { waitForOutput } from 'test-ipfs-example/node'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

await waitForOutput('This message is sent on a private network', 'node', [path.join(__dirname, 'index.js')], {
  cwd: __dirname
})
