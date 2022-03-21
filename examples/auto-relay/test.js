import path from 'path'
import execa from 'execa'
import pDefer from 'p-defer'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function startProcess (name, args = []) {
  return execa('node', [path.join(__dirname, name), ...args], {
    cwd: path.resolve(__dirname),
    all: true
  })
}

export async function test () {
  let output1 = ''
  let output2 = ''
  let output3 = ''
  let relayAddr
  let autoRelayAddr

  const proc1Ready = pDefer()
  const proc2Ready = pDefer()

  // Step 1 process
  process.stdout.write('relay.js\n')

  const proc1 = startProcess('relay.js')
  proc1.all.on('data', async (data) => {
    process.stdout.write(data)

    output1 += uint8ArrayToString(data)

    if (output1.includes('Listening on:') && output1.includes('/p2p/')) {
      relayAddr = output1.trim().split('Listening on:\n')[1].split('\n')[0]
      proc1Ready.resolve()
    }
  })

  await proc1Ready.promise
  process.stdout.write('==================================================================\n')

  // Step 2 process
  process.stdout.write('listener.js\n')

  const proc2 = startProcess('listener.js', [relayAddr])
  proc2.all.on('data', async (data) => {
    process.stdout.write(data)

    output2 += uint8ArrayToString(data)

    if (output2.includes('Advertising with a relay address of') && output2.includes('/p2p/')) {
      autoRelayAddr = output2.trim().split('Advertising with a relay address of ')[1]
      proc2Ready.resolve()
    }
  })

  await proc2Ready.promise
  process.stdout.write('==================================================================\n')

  // Step 3 process
  process.stdout.write('dialer.js\n')

  const proc3 = startProcess('dialer.js', [autoRelayAddr])
  proc3.all.on('data', async (data) => {
    process.stdout.write(data)

    output3 += uint8ArrayToString(data)

    if (output3.includes('Connected to the auto relay node via')) {
      const remoteAddr = output3.trim().split('Connected to the auto relay node via ')[1]

      if (remoteAddr === autoRelayAddr) {
        proc3.kill()
        proc2.kill()
        proc1.kill()
      } else {
        throw new Error('dialer did not dial through the relay')
      }
    }
  })

  await Promise.all([
    proc1,
    proc2,
    proc3
  ]).catch((err) => {
    if (err.signal !== 'SIGTERM') {
      throw err
    }
  })
}
