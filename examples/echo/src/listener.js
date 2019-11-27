'use strict'
/* eslint-disable no-console */

/*
 * Listener Node
 */

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const Node = require('./libp2p-bundle')
const pipe = require('it-pipe')

async function run() {
  const listenerId = await PeerId.createFromJSON(require('./id-l'))

  // Listener libp2p node
  const listenerPeerInfo = new PeerInfo(listenerId)
  listenerPeerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/10333')
  const listenerNode = new Node({
    peerInfo: listenerPeerInfo
  })

  // Log a message when we receive a connection
  listenerNode.on('peer:connect', (peerInfo) => {
    console.log('received dial to me from:', peerInfo.id.toB58String())
  })

  // Handle incoming connections for the protocol by piping from the stream
  // back to itself (an echo)
  await listenerNode.handle('/echo/1.0.0', ({ stream }) => pipe(stream.source, stream.sink))

  // Start listening
  await listenerNode.start()

  console.log('Listener ready, listening on:')
  listenerNode.peerInfo.multiaddrs.forEach((ma) => {
    console.log(ma.toString() + '/p2p/' + listenerId.toB58String())
  })
}

run()
