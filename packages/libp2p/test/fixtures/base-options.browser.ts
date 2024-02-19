import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { mockConnectionGater } from '@libp2p/interface-compliance-tests/mocks'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import mergeOptions from 'merge-options'
import type { Libp2pOptions } from '../../src/index.js'
import type { ServiceMap } from '@libp2p/interface'

export function createBaseOptions <T extends ServiceMap = Record<string, unknown>> (overrides?: Libp2pOptions<T>): Libp2pOptions<T> {
  const options: Libp2pOptions = {
    transports: [
      webSockets({
        filter: filters.all
      }),
      circuitRelayTransport()
    ],
    streamMuxers: [
      mplex(),
      mplex()
    ],
    connectionEncryption: [
      plaintext()
    ],
    connectionGater: mockConnectionGater()
  }

  return mergeOptions(options, overrides)
}
