
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '../../src/insecure/index.js'
import type { Libp2pOptions } from '../../src/index.js'
import mergeOptions from 'merge-options'
import { circuitRelayTransport } from '../../src/circuit-relay/index.js'
import { yamux } from '@chainsafe/libp2p-yamux'
import type { ServiceMap } from '@libp2p/interface-libp2p'

export function createBaseOptions <T extends ServiceMap = {}> (overrides?: Libp2pOptions<T>): Libp2pOptions<T> {
  const options: Libp2pOptions = {
    transports: [
      webSockets({
        filter: filters.all
      }),
      circuitRelayTransport()
    ],
    streamMuxers: [
      yamux(),
      mplex()
    ],
    connectionEncryption: [
      plaintext()
    ]
  }

  return mergeOptions(options, overrides)
}
