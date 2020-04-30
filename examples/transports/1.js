/* eslint-disable no-console */
'use strict'

const Libp2p = require('../..')
const TCP = require('libp2p-tcp')
const SECIO = require('libp2p-secio')

const createNode = async () => {
  const node = await Libp2p.create({
    addresses: {
      // To signall the addresses we want to be available, we use
      // the multiaddr format, a self describable address
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP],
      connEncryption: [SECIO]
    }
  })

  await node.start()
  return node
}

;(async () => {
  const node = await createNode()

  console.log('node has started (true/false):', node.isStarted())
  console.log('listening on:')
  node.transportManager.getAddrs().forEach((ma) => console.log(`${ma.toString()}/p2p/${node.peerId.toB58String()}`))
})();
