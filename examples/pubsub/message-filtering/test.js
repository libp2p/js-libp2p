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

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    const line = uint8ArrayToString(data)

    // End
    if (line.includes('all messages sent')) {
      if (messages.car > 0) {
        defer.reject(new Error('Message validation failed - peers failed to filter car messages'))
      }

      for (const fruit of ['banana', 'apple', 'orange']) {
        if (messages[fruit] !== 2) {
          defer.reject(new Error(`Not enough ${fruit} messages - received ${messages[fruit] ?? 0}, expected 2`))
        }
      }

      defer.resolve()
    }

    if (line.includes('received:')) {
      const fruit = line.split('received:')[1].trim()
      messages[fruit] = (messages[fruit] ?? 0) + 1
    }
  })

  await defer.promise
  proc.kill()
}
