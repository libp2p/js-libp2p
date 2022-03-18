import { createLibp2p } from 'libp2p'
import { WebSockets } from '@libp2p/websockets'
import { Noise } from '@chainsafe/libp2p-noise'
import { Mplex } from '@libp2p/mplex'

async function main () {
  const autoRelayNodeAddr = process.argv[2]
  if (!autoRelayNodeAddr) {
    throw new Error('the auto relay node address needs to be specified')
  }

  const node = await createLibp2p({
    transports: [
      new WebSockets()
    ],
    connEncrypters: [
      new Noise()
    ],
    streamMuxers: [
      new Mplex()
    ]
  })

  await node.start()
  console.log(`Node started with id ${node.peerId.toB58String()}`)

  const conn = await node.dial(autoRelayNodeAddr)
  console.log(`Connected to the auto relay node via ${conn.remoteAddr.toString()}`)
}

main()
