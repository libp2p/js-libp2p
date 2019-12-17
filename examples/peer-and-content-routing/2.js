/* eslint-disable no-console */
'use strict'

const Libp2p = require('../../')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const CID = require('cids')
const KadDHT = require('libp2p-kad-dht')

const all = require('it-all')
const delay = require('delay')

const createNode = async () => {
  const peerInfo = await PeerInfo.create()
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

  const node = await Libp2p.create({
    peerInfo,
    modules: {
      transport: [TCP],
      streamMuxer: [Mplex],
      connEncryption: [SECIO],
      dht: KadDHT
    },
    config: {
      dht: {
        enabled: true
      }
    }
  })

  await node.start()
  return node
}

;(async () => {
  const [node1, node2, node3] = await Promise.all([
    createNode(),
    createNode(),
    createNode()
  ])

  await Promise.all([
    node1.dial(node2.peerInfo),
    node2.dial(node3.peerInfo)
  ])

  const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')
  await node1.contentRouting.provide(cid)

  console.log('Node %s is providing %s', node1.peerInfo.id.toB58String(), cid.toBaseEncodedString())

  // wait for propagation
  await delay(300)

  const providers = await all(node3.contentRouting.findProviders(cid, { timeout: 3000 }))

  console.log('Found provider:', providers[0].id.toB58String())
})();
