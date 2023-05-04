import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '../../src/insecure/index.js'
import type { Libp2pOptions } from '../../src'
import mergeOptions from 'merge-options'
import type { ServiceMap } from '@libp2p/interface-libp2p'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { circuitRelayTransport } from '../../src/circuit-relay/index.js'
import { MULTIADDRS_WEBSOCKETS } from '../fixtures/browser.js'

export function createBaseOptions <T extends ServiceMap = {}> (...overrides: Array<Libp2pOptions<T>>): Libp2pOptions<T> {
  const options: Libp2pOptions = {
    addresses: {
      listen: [`${MULTIADDRS_WEBSOCKETS}/p2p-circuit`]
    },
    transports: [
      tcp(),
      webSockets({
        filter: filters.all
      }),
      circuitRelayTransport()
    ],
    streamMuxers: [
      mplex()
    ],
    connectionEncryption: [
      plaintext()
    ]
  }

  return mergeOptions(options, ...overrides)
}
