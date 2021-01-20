'use strict'

const path = require('path')
const execa = require('execa')
const pDefer = require('p-defer')
const uint8ArrayToString = require('uint8arrays/to-string')

function startProcess(name) {
  return execa('node', [path.join(__dirname, name)], {
    cwd: path.resolve(__dirname),
    all: true
  })
}

async function test () {
  const message = 'test message'
  let listenerOutput = ''
  let dialerOutput = ''

  let isListening = false
  let messageSent = false
  const listenerReady = pDefer()
  const dialerReady = pDefer()
  const messageReceived = pDefer()

  // Step 1 process
  process.stdout.write('node listener.js\n')
  const listenerProc = startProcess('src/listener.js')
  listenerProc.all.on('data', async (data) => {
    process.stdout.write(data)

    listenerOutput += uint8ArrayToString(data)

    if (!isListening && listenerOutput.includes('Listener ready, listening on')) {
      listenerReady.resolve()
      isListening = true
    } else if (isListening && listenerOutput.includes(message)) {
      messageReceived.resolve()
    }
  })

  await listenerReady.promise
  process.stdout.write('==================================================================\n')

  // Step 2 process
  process.stdout.write('node dialer.js\n')
  const dialerProc = startProcess('src/dialer.js')
  dialerProc.all.on('data', async (data) => {
    process.stdout.write(data)
    dialerOutput += uint8ArrayToString(data)

    if (!messageSent && dialerOutput.includes('Type a message and see what happens')) {
      dialerReady.resolve()
      dialerProc.stdin.write(message)
      dialerProc.stdin.write('\n')
      messageSent = true
    }
  })

  await dialerReady.promise
  process.stdout.write('==================================================================\n')
  await messageReceived.promise
  process.stdout.write('chat message received\n')

  listenerProc.kill()
  dialerProc.kill()
  await Promise.all([
    listenerProc,
    dialerProc
  ]).catch((err) => {
    if (err.signal !== 'SIGTERM') {
      throw err
    }
  })
}

module.exports = test
