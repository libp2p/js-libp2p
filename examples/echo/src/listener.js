'use strict'
/* eslint-disable no-console */

/*
 * Listener Node
 */

const PeerId = require('peer-id')
const Node = require('./libp2p-bundle')
const pipe = require('it-pipe')

async function run() {
  const listenerId = await PeerId.createFromJSON(require('./id-l'))

  // Listener libp2p node
  const listenerNode = new Node({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/10333']
    },
    peerId: listenerId
  })

  // Log a message when we receive a connection
  listenerNode.connectionManager.on('peer:connect', (connection) => {
    console.log('received dial to me from:', connection.remotePeer.toB58String())
  })

  // Handle incoming connections for the protocol by piping from the stream
  // back to itself (an echo)
  await listenerNode.handle('/echo/1.0.0', ({ stream }) => pipe(stream.source, stream.sink))

  // Start listening
  await listenerNode.start()

  console.log('Listener ready, listening on:')
  listenerNode.multiaddrs.forEach((ma) => {
    console.log(ma.toString() + '/p2p/' + listenerId.toB58String())
  })
}

run()
