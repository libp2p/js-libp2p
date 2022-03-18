import path from 'path'
import execa from 'execa'
import pWaitFor from 'p-wait-for'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'

const discoveredCopy = 'discovered:'

export default async function test() {
  let discoverCount = 0

  process.stdout.write('3.js\n')

  const proc = execa('node', [path.join(__dirname, '3.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    const line = uint8ArrayToString(data)

    // Discovered or Connected
    if (line.includes(discoveredCopy)) {
      discoverCount++
    }
  })

  await pWaitFor(() => discoverCount === 4)

  proc.kill()
}
