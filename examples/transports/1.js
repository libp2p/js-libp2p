/* eslint-disable no-console */
'use strict'

const Libp2p = require('../..')
const TCP = require('libp2p-tcp')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')

const createNode = async (peerInfo) => {
  // To signall the addresses we want to be available, we use
  // the multiaddr format, a self describable address
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

  const node = await Libp2p.create({
    peerInfo,
    modules: {
      transport: [TCP],
      connEncryption: [SECIO]
    }
  })

  await node.start()
  return node
}

;(async () => {
  const peerInfo = await PeerInfo.create()
  const node = await createNode(peerInfo)

  console.log('node has started (true/false):', node.isStarted())
  console.log('listening on:')
  node.peerInfo.multiaddrs.forEach((ma) => console.log(ma.toString()))
})();
