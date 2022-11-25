/* eslint-disable no-console */

/*
 * Dialer Node
 */

import { createLibp2p } from './libp2p.js'
import { pipe } from 'it-pipe'
import idd from './id-d.js'
import idl from './id-l.js'
import { createFromJSON } from '@libp2p/peer-id-factory'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { multiaddr } from '@multiformats/multiaddr'

async function run() {
  const [dialerId, listenerId] = await Promise.all([
    createFromJSON(idd),
    createFromJSON(idl)
  ])

  // Dialer
  const dialerNode = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    peerId: dialerId
  })

  // Add peer to Dial (the listener) into the PeerStore
  const listenerMultiaddr = multiaddr('/ip4/127.0.0.1/tcp/10333/p2p/' + listenerId.toString())

  // Start the dialer libp2p node
  await dialerNode.start()

  console.log('Dialer ready, listening on:')
  dialerNode.getMultiaddrs().forEach((ma) => console.log(ma.toString()))

  // Dial the listener node
  console.log('Dialing to peer:', listenerMultiaddr)
  const stream = await dialerNode.dialProtocol(listenerMultiaddr, '/echo/1.0.0')

  console.log('nodeA dialed to nodeB on protocol: /echo/1.0.0')

  pipe(
    // Source data
    [uint8ArrayFromString('hey')],
    // Write to the stream, and pass its output to the next function
    stream,
    // Sink function
    async function (source) {
      // For each chunk of data
      for await (const data of source) {
        // Output the data
        console.log('received echo:', uint8ArrayToString(data.subarray()))
      }
    }
  )
}

run()
