/* eslint-disable no-console */

import { Multiaddr } from '@multiformats/multiaddr'
import { createLibp2p } from './libp2p.js'
import { stdinToStream, streamToConsole } from './stream.js'

async function run () {
  const [idDialer, idListener] = await Promise.all([
    PeerId.createFromJSON(require('./peer-id-dialer')),
    PeerId.createFromJSON(require('./peer-id-listener'))
  ])

  // Create a new libp2p node on localhost with a randomly chosen port
  const nodeDialer = await createLibp2p({
    peerId: idDialer,
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    }
  })

  // Start the libp2p host
  await nodeDialer.start()

  // Output this node's address
  console.log('Dialer ready, listening on:')
  nodeDialer.multiaddrs.forEach((ma) => {
    console.log(ma.toString() + '/p2p/' + idDialer.toString())
  })

  // Dial to the remote peer (the "listener")
  const listenerMa = new Multiaddr(`/ip4/127.0.0.1/tcp/10333/p2p/${idListener.toString()}`)
  const { stream } = await nodeDialer.dialProtocol(listenerMa, '/chat/1.0.0')

  console.log('Dialer dialed to listener on protocol: /chat/1.0.0')
  console.log('Type a message and see what happens')

  // Send stdin to the stream
  stdinToStream(stream)
  // Read the stream and output to console
  streamToConsole(stream)
}

run()
