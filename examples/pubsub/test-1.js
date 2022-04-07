import path from 'path'
import execa from 'execa'
import pDefer from 'p-defer'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function test () {
  const defer = pDefer()
  process.stdout.write('1.js\n')

  const proc = execa('node', [path.join(__dirname, '1.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    const line = uint8ArrayToString(data)

    if (line.includes('node1 received: Bird bird bird, bird is the word!')) {
      defer.resolve()
    }
  })

  await defer.promise
  proc.kill()
}
