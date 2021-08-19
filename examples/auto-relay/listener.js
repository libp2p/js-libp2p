'use strict'

const Libp2p = require('libp2p')
const Websockets = require('libp2p-websockets')
const { NOISE } = require('@chainsafe/libp2p-noise')
const MPLEX = require('libp2p-mplex')

async function main () {
  const relayAddr = process.argv[2]
  if (!relayAddr) {
    throw new Error('the relay address needs to be specified as a parameter')
  }

  const node = await Libp2p.create({
    modules: {
      transport: [Websockets],
      connEncryption: [NOISE],
      streamMuxer: [MPLEX]
    },
    config: {
      relay: {
        enabled: true,
        autoRelay: {
          enabled: true,
          maxListeners: 2
        }
      }
    }
  })

  await node.start()
  console.log(`Node started with id ${node.peerId.toB58String()}`)

  const conn = await node.dial(relayAddr)

  console.log(`Connected to the HOP relay ${conn.remotePeer.toString()}`)

  // Wait for connection and relay to be bind for the example purpose
  node.peerStore.on('change:multiaddrs', ({ peerId }) => {
    // Updated self multiaddrs?
    if (peerId.equals(node.peerId)) {
      console.log(`Advertising with a relay address of ${node.multiaddrs[0].toString()}/p2p/${node.peerId.toB58String()}`)
    }
  })  
}

main()
