import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'
import { tcp } from '@libp2p/tcp'
import { webSockets } from '@libp2p/websockets'
import defaultsDeep from '@nodeutils/defaults-deep'
import { createLibp2p as createNode } from 'libp2p'

export async function createLibp2p (_options) {
  const defaults = {
    transports: [
      tcp(),
      webSockets()
    ],
    streamMuxers: [
      yamux(), mplex()
    ],
    connectionEncryption: [
      noise()
    ]
  }

  return createNode(defaultsDeep(_options, defaults))
}
