import path from 'path'
import { execa } from 'execa'
import pDefer from 'p-defer'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// holds messages received by peers
const messages = {}

export async function test () {
  const defer = pDefer()

  process.stdout.write('message-filtering/1.js\n')

  const proc = execa('node', [path.join(__dirname, '1.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  let output = ''

  const expected = [
    'node2 received: banana',
    'node2 received: apple',
    'node2 received: orange',
    'node3 received: banana',
    'node3 received: apple',
    'node3 received: orange'
  ]

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    output += uint8ArrayToString(data)

    if (output.includes('received: car')) {
      defer.reject(new Error('Message validation failed - peers failed to filter car messages'))
    }

    let allMessagesReceived = true

    expected.forEach(message => {
      if (!output.includes(message)) {
        allMessagesReceived = false
      }
    })

    if (allMessagesReceived) {
      defer.resolve()
    }
  })

  await defer.promise
  proc.kill()
}
