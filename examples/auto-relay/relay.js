import { createLibp2p } from 'libp2p'
import { WebSockets } from '@libp2p/websockets'
import { Noise } from '@chainsafe/libp2p-noise'
import { Mplex } from '@libp2p/mplex'

async function main () {
  const node = await createLibp2p({
    transport: [
      new WebSockets()
    ],
    connectionEncrypters: [
      new Noise()
    ],
    streamMuxers: [
      new Mplex()
    ],
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0/ws']
      // TODO check "What is next?" section
      // announce: ['/dns4/auto-relay.libp2p.io/tcp/443/wss/p2p/QmWDn2LY8nannvSWJzruUYoLZ4vV83vfCBwd8DipvdgQc3']
    },
    relay: {
      enabled: true,
      hop: {
        enabled: true
      },
      advertise: {
        enabled: true,
      }
    }
  })

  await node.start()

  console.log(`Node started with id ${node.peerId.toB58String()}`)
  console.log('Listening on:')
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
}

main()
