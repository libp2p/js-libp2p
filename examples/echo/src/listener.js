/* eslint-disable no-console */

/*
 * Listener Node
 */

import { createLibp2p } from './libp2p.js'
import { pipe } from 'it-pipe'
import { createFromJSON } from '@libp2p/peer-id-factory'
import idl from './id-l.js'

async function run() {
  const listenerId = await createFromJSON(idl)

  // Listener libp2p node
  const listenerNode = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/10333']
    },
    peerId: listenerId
  })

  // Log a message when we receive a connection
  listenerNode.addEventListener('peer:connect', (evt) => {
    const remotePeer = evt.detail
    console.log('received dial to me from:', remotePeer.toString())
  })

  // Handle incoming connections for the protocol by piping from the stream
  // back to itself (an echo)
  await listenerNode.handle('/echo/1.0.0', ({ stream }) => pipe(stream.source, stream.sink))

  console.log('Listener ready, listening on:')
  listenerNode.getMultiaddrs().forEach((ma) => {
    console.log(ma.toString())
  })
}

run()
