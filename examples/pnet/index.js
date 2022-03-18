/* eslint no-console: ["off"] */
'use strict'

const { generate } from 'libp2p/src/pnet')
const privateLibp2pNode from './libp2p-node')

import { pipe } from 'it-pipe'

// Create a Uint8Array and write the swarm key to it
const swarmKey = new Uint8Array(95)
generate(swarmKey)

// This key is for testing a different key not working
const otherSwarmKey = new Uint8Array(95)
generate(otherSwarmKey)

;(async () => {
  const node1 = await privateLibp2pNode(swarmKey)

  // TASK: switch the commented out line below so we're using a different key, to see the nodes fail to connect
  const node2 = await privateLibp2pNode(swarmKey)
  // const node2 = await privateLibp2pNode(otherSwarmKey)

  await Promise.all([
    node1.start(),
    node2.start()
  ])

  console.log('nodes started...')

  // Add node 2 data to node1's PeerStore
  await node1.peerStore.addressBook.set(node2.peerId, node2.multiaddrs)
  await node1.dial(node2.peerId)

  node2.handle('/private', ({ stream }) => {
    pipe(
      stream,
      async function (source) {
        for await (const msg of source) {
          console.log(msg.toString())
        }
      }
    )
  })

  const { stream } = await node1.dialProtocol(node2.peerId, '/private')

  await pipe(
    ['This message is sent on a private network'],
    stream
  )
})()
