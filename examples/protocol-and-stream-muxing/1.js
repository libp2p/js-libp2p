'use strict'

const Libp2p = require('../../')
const TCP = require('libp2p-tcp')
const MPLEX = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')

const pipe = require('it-pipe')
const { map } = require('streaming-iterables')
const { toBuffer } = require('it-buffer')

const createNode = async () => {
  const peerInfo = await PeerInfo.create()
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')

  const node = await Libp2p.create({
    peerInfo,
    modules: {
      transport: [TCP],
      streamMuxer: [MPLEX], // TODO: should not need this
      connEncryption: [SECIO] // TODO: should not need this
    }
  })

  await node.start()

  return node
}

;(async () => {
  const [node1, node2] = await Promise.all([
    createNode(),
    createNode()
  ])

  // exact matching
  node2.handle('/your-protocol', ({ stream }) => {
    pipe(
      stream,
      toBuffer,
      map(String),
      source => (async function () {
        for await (const msg of source) {
          console.log(msg)
        }
      })()
    )
  })

  // semver matching
  /*
  node2.handle('/another-protocol/1.0.1', ({ stream }) => {
    pipe(
      stream,
      toBuffer,
      map(String),
      source => (async function () {
        for await (const msg of source) {
          console.log(msg)
        }
      })()
    )
  })
  */

  const { stream } = await node1.dialProtocol(node2.peerInfo, ['/your-protocol'])
  await pipe(
    ['my own protocol, wow!'],
    stream
  )

  /*
  const { stream } = node1.dialProtocol(node2.peerInfo, ['/another-protocol/1.0.0'])

  await pipe(
    ['my own protocol, wow!'],
    stream
  )
  */
})();
