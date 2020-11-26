'use strict'
/* eslint-disable no-console */

const PeerId = require('peer-id')
const createLibp2p = require('./libp2p-bundle.js')
const { stdinToStream, streamToConsole } = require('./stream')

async function run() {
  // Create a new libp2p node with the given multi-address
  const idListener = await PeerId.createFromJSON(require('./peer-id-listener'))
  const nodeListener = await createLibp2p({
    peerId: idListener,
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/10333']
    }
  })

  // Log a message when a remote peer connects to us
  nodeListener.connectionManager.on('peer:connect', (connection) => {
    console.log('connected to: ', connection.remotePeer.toB58String())
  })

  // Handle messages for the protocol
  await nodeListener.handle('/chat/1.0.0', async ({ stream }) => {
    // Send stdin to the stream
    stdinToStream(stream)
    // Read the stream and output to console
    streamToConsole(stream)
  })

  // Start listening
  await nodeListener.start()

  // Output listen addresses to the console
  console.log('Listener ready, listening on:')
  nodeListener.multiaddrs.forEach((ma) => {
    console.log(ma.toString() + '/p2p/' + idListener.toB58String())
  })
}

run()
