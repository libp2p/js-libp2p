import { createLibp2p } from 'libp2p'
import { WebSockets } from '@libp2p/websockets'
import { Noise } from '@chainsafe/libp2p-noise'
import { Mplex } from '@libp2p/mplex'

async function main () {
  const relayAddr = process.argv[2]
  if (!relayAddr) {
    throw new Error('the relay address needs to be specified as a parameter')
  }

  const node = await createLibp2p({
    transports: [
      new WebSockets()
    ],
    connectionEncryption: [
      new Noise()
    ],
    streamMuxers: [
      new Mplex()
    ],
    relay: {
      enabled: true,
      autoRelay: {
        enabled: true,
        maxListeners: 2
      }
    }
  })

  await node.start()
  console.log(`Node started with id ${node.peerId.toString()}`)

  const conn = await node.dial(relayAddr)

  console.log(`Connected to the HOP relay ${conn.remotePeer.toString()}`)

  // Wait for connection and relay to be bind for the example purpose
  node.peerStore.on('change:multiaddrs', ({ peerId }) => {
    // Updated self multiaddrs?
    if (peerId.equals(node.peerId)) {
      console.log(`Advertising with a relay address of ${node.multiaddrs[0].toString()}/p2p/${node.peerId.toString()}`)
    }
  })
}

main()
