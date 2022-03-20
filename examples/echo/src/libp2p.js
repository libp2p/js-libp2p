import { TCP } from '@libp2p/tcp'
import { WebSockets } from '@libp2p/websockets'
import { Mplex } from '@libp2p/mplex'
import { Noise } from '@chainsafe/libp2p-noise'
import defaultsDeep from '@nodeutils/defaults-deep'
import { createLibp2p } from '../../../dist/src/index.js'

export default async function createNode(_options) {
  const defaults = {
    transport: [
      new TCP(),
      new WebSockets()
    ],
    streamMuxer: [
      new Mplex()
    ],
    connectionEncryption: [
      new Noise()
    ]
  }

  return createLibp2p(defaultsDeep(_options, defaults))
}
