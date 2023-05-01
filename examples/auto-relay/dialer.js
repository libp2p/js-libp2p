import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { multiaddr } from '@multiformats/multiaddr'
import { yamux } from '@chainsafe/libp2p-yamux/dist/src'
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import { identifyService } from 'libp2p/identify'

async function main () {
  const autoRelayNodeAddr = process.argv[2]
  if (!autoRelayNodeAddr) {
    throw new Error('the auto relay node address needs to be specified')
  }

  const node = await createLibp2p({
    transports: [
      webSockets(),
      circuitRelayTransport()
    ],
    connectionEncryption: [
      noise()
    ],
    streamMuxers: [
      yamux(),
      mplex()
    ],
    services: {
      identify: identifyService()
    }
  })

  console.log(`Node started with id ${node.peerId.toString()}`)

  const conn = await node.dial(multiaddr(autoRelayNodeAddr))
  console.log(`Connected to the auto relay node via ${conn.remoteAddr.toString()}`)
}

main()
