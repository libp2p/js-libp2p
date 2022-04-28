'use strict'

const Libp2p = require('libp2p')
const TCP = require('libp2p-tcp')
const { NOISE } = require('@chainsafe/libp2p-noise')

const createNode = async () => {
  const node = await Libp2p.create({
    addresses: {
      // To signal the addresses we want to be available, we use
      // the multiaddr format, a self describable address
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP],
      connEncryption: [NOISE]
    }
  })

  await node.start()

  console.log('node has started (true/false):', node.isStarted())
  console.log('listening on:')
  node.multiaddrs.forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))

  return node
}

createNode().catch(err => {
  console.error(err)
  process.exit(1)
})
