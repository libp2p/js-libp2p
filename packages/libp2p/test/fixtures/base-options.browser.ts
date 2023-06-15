
import { yamux } from '@chainsafe/libp2p-yamux'
import { mockConnectionGater } from '@libp2p/interface-mocks'
import { mplex } from '@libp2p/mplex'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import mergeOptions from 'merge-options'
import { circuitRelayTransport } from '../../src/circuit-relay/index.js'
import { plaintext } from '../../src/insecure/index.js'
import type { Libp2pOptions } from '../../src/index.js'
import type { ServiceMap } from '@libp2p/interface-libp2p'

export function createBaseOptions <T extends ServiceMap = Record<string, unknown>> (overrides?: Libp2pOptions<T>): Libp2pOptions<T> {
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
    ],
    connectionGater: mockConnectionGater()
  }

  return mergeOptions(options, overrides)
}
