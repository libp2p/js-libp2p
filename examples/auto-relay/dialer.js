import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { Noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'

async function main () {
  const autoRelayNodeAddr = process.argv[2]
  if (!autoRelayNodeAddr) {
    throw new Error('the auto relay node address needs to be specified')
  }

  const node = await createLibp2p({
    transports: [
      webSockets()
    ],
    connectionEncryption: [
      () => new Noise()
    ],
    streamMuxers: [
      mplex()
    ]
  })

  await node.start()
  console.log(`Node started with id ${node.peerId.toString()}`)

  const conn = await node.dial(autoRelayNodeAddr)
  console.log(`Connected to the auto relay node via ${conn.remoteAddr.toString()}`)
}

main()
