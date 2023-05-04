/* eslint-disable no-console */

import { createLibp2p } from './libp2p.js'
import { stdinToStream, streamToConsole } from './stream.js'
import { createFromJSON } from '@libp2p/peer-id-factory'
import peerIdListenerJson from './peer-id-listener.js'

async function run () {
  // Create a new libp2p node with the given multi-address
  const idListener = await createFromJSON(peerIdListenerJson)
  const nodeListener = await createLibp2p({
    peerId: idListener,
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/10333']
    }
  })

  // Log a message when a remote peer connects to us
  nodeListener.addEventListener('peer:connect', (evt) => {
    const remotePeer = evt.detail
    console.log('connected to: ', remotePeer.toString())
  })

  // Handle messages for the protocol
  await nodeListener.handle('/chat/1.0.0', async ({ stream }) => {
    // Send stdin to the stream
    stdinToStream(stream)
    // Read the stream and output to console
    streamToConsole(stream)
  })

  // Output listen addresses to the console
  console.log('Listener ready, listening on:')
  nodeListener.getMultiaddrs().forEach((ma) => {
    console.log(ma.toString())
  })
}

run()
