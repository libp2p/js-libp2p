import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { mockConnectionGater } from '@libp2p/interface-compliance-tests/mocks'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import mergeOptions from 'merge-options'
import { isWebWorker } from 'wherearewe'
import type { ServiceMap } from '@libp2p/interface'
import type { Libp2pOptions } from 'libp2p'

export function createBaseOptions <T extends ServiceMap = Record<string, unknown>> (overrides?: Libp2pOptions<T>): Libp2pOptions<T> {
  const options: Libp2pOptions = {
    addresses: {
      listen: [
        `${process.env.RELAY_MULTIADDR}/p2p-circuit`
      ]
    },
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
    connectionGater: mockConnectionGater(),
    services: {
      identify: identify()
    }
  }

  // WebWorkers cannot do WebRTC so only add support if we are not in a worker
  // context
  if (!isWebWorker) {
    options.addresses?.listen?.push('/webrtc')
    options.transports?.push(webRTC())
  }

  return mergeOptions(options, overrides)
}
