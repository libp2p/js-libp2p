'use strict'

const path = require('path')
const execa = require('execa')
const delay = require('delay')
const pDefer = require('p-defer')
const uint8ArrayToString = require('uint8arrays/to-string')

const { createRendezvousServer } = require('../../../test/rendezvous/utils')

function startProcess(name, args = []) {
  return execa('node', [path.join(__dirname, name), ...args], {
    cwd: path.resolve(__dirname),
    all: true
  })
}

async function test() {
  let output1 = ''
  let output2 = ''
  const proc1Ready = pDefer()
  const proc2Ready = pDefer()

  // Start Rendezvous Server
  const rendezvousServer = await createRendezvousServer({
    config: {
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0/ws']
      }
    }
  })

  // Wait for server to be listenning
  await delay(1000)
  const rendezvousServerMa = `${rendezvousServer.multiaddrs[0]}/p2p/${rendezvousServer.peerId.toB58String()}`

  // Step 1 process
  process.stdout.write('listener.js\n')

  const proc1 = startProcess('listener.js', [rendezvousServerMa])
  proc1.all.on('data', async (data) => {
    process.stdout.write(data)

    output1 += uint8ArrayToString(data)

    if (output1.includes('Node listening on:') && output1.includes('Registered to:')) {
      proc1Ready.resolve()
    }
  })

  await proc1Ready.promise
  process.stdout.write('==================================================================\n')

  // Step 2 process
  process.stdout.write('dialer.js\n')

  const proc2 = startProcess('dialer.js', [rendezvousServerMa])
  proc2.all.on('data', async (data) => {
    process.stdout.write(data)

    output2 += uint8ArrayToString(data)

    if (output2.includes('Discovered peer with id:')) {
      proc2Ready.resolve()
      proc2.kill()
      proc1.kill()
    }
  })

  await proc2Ready.promise

  await Promise.all([
    proc1,
    proc2
  ]).catch((err) => {
    if (err.signal !== 'SIGTERM') {
      throw err
    }
  })

  await rendezvousServer.stop()
}

module.exports = test
