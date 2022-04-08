import path from 'path'
import execa from 'execa'
import pWaitFor from 'p-wait-for'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function test () {
  let discoveredNodes = 0

  process.stdout.write('3.js\n')

  const proc = execa('node', [path.join(__dirname, '3.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    const str = uint8ArrayToString(data)

    str.split('\n').forEach(line => {
      if (line.includes('discovered:')) {
        discoveredNodes++
      }
    })
  })

  await pWaitFor(() => discoveredNodes > 3)

  proc.kill()
}
