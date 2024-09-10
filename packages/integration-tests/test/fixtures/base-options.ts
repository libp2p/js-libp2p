import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { tcp } from '@libp2p/tcp'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import mergeOptions from 'merge-options'
import type { ServiceMap } from '@libp2p/interface'
import type { Libp2pOptions } from 'libp2p'

export function createBaseOptions <T extends ServiceMap = Record<string, unknown>> (...overrides: Array<Libp2pOptions<T>>): Libp2pOptions<T> {
  const options: Libp2pOptions = {
    addresses: {
      listen: [
        `${process.env.RELAY_MULTIADDR}/p2p-circuit`,
        '/ip4/0.0.0.0/tcp/0',
        '/webrtc'
      ]
    },
    transports: [
      tcp(),
      webRTC(),
      webSockets({
        filter: filters.all
      }),
      circuitRelayTransport()
    ],
    streamMuxers: [
      yamux(),
      mplex()
    ],
    connectionEncrypters: [
      plaintext()
    ],
    services: {
      identify: identify()
    }
  }

  return mergeOptions(options, ...overrides)
}
