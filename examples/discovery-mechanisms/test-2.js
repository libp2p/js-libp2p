import path from 'path'
import execa from 'execa'
import pWaitFor from 'p-wait-for'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const discoveredCopy = 'Discovered:'

export async function test () {
  const discoveredNodes = []

  process.stdout.write('2.js\n')

  const proc = execa('node', [path.join(__dirname, '2.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    const line = uint8ArrayToString(data)

    if (line.includes(discoveredCopy)) {
      const id = line.trim().split(discoveredCopy)[1]
      discoveredNodes.push(id)
    }
  })

  await pWaitFor(() => discoveredNodes.length === 2)

  proc.kill()
}
