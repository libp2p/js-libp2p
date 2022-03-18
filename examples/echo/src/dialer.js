'use strict'
/* eslint-disable no-console */

/*
 * Dialer Node
 */


import { createLibp2p } from './libp2p.js'
import { pipe } from 'it-pipe'

async function run() {
  const [dialerId, listenerId] = await Promise.all([
    PeerId.createFromJSON(require('./id-d')),
    PeerId.createFromJSON(require('./id-l'))
  ])

  // Dialer
  const dialerNode = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    peerId: dialerId
  })

  // Add peer to Dial (the listener) into the PeerStore
  const listenerMultiaddr = '/ip4/127.0.0.1/tcp/10333/p2p/' + listenerId.toB58String()

  // Start the dialer libp2p node
  await dialerNode.start()

  console.log('Dialer ready, listening on:')
  dialerNode.multiaddrs.forEach((ma) => console.log(ma.toString() +
        '/p2p/' + dialerId.toB58String()))

  // Dial the listener node
  console.log('Dialing to peer:', listenerMultiaddr)
  const { stream } = await dialerNode.dialProtocol(listenerMultiaddr, '/echo/1.0.0')

  console.log('nodeA dialed to nodeB on protocol: /echo/1.0.0')

  pipe(
    // Source data
    ['hey'],
    // Write to the stream, and pass its output to the next function
    stream,
    // Sink function
    async function (source) {
      // For each chunk of data
      for await (const data of source) {
        // Output the data
        console.log('received echo:', data.toString())
      }
    }
  )
}

run()
