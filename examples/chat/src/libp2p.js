import { tcp } from '@libp2p/tcp'
import { webSockets } from '@libp2p/websockets'
import { mplex } from '@libp2p/mplex'
import { yamux } from '@chainsafe/libp2p-yamux'
import { noise } from '@chainsafe/libp2p-noise'
import defaultsDeep from '@nodeutils/defaults-deep'
import { createLibp2p as create } from 'libp2p'

export async function createLibp2p (_options) {
  const defaults = {
    transports: [
      tcp(),
      webSockets()
    ],
    streamMuxers: [
      mplex(),
      yamux()
    ],
    connectionEncryption: [
      noise()
    ]
  }

  return create(defaultsDeep(_options, defaults))
}
