import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { tcp } from '@libp2p/tcp'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { yamux } from '@libp2p/yamux'
import type { ServiceMap } from '@libp2p/interface'
import type { Libp2pOptions } from 'libp2p'

export function createBaseOptions <T extends ServiceMap = Record<string, unknown>> (overrides: Libp2pOptions<T> = {}): Libp2pOptions<T> {
  const options: Libp2pOptions = {
    addresses: {
      listen: [
        `${process.env.RELAY_MULTIADDR}/p2p-circuit`,
        '/ip4/0.0.0.0/tcp/0',
        '/webrtc'
      ]
    },
    connectionMonitor: {
      enabled: false
    },
    transports: [
      tcp(),
      webRTC(),
      webSockets(),
      circuitRelayTransport()
    ],
    streamMuxers: [
      yamux(),
      mplex()
    ],
    connectionEncrypters: [
      plaintext()
    ],
    // @ts-expect-error overrides could cause services to have wrong type
    services: {
      identify: identify()
    },
    ...overrides
  }

  // @ts-expect-error overrides could cause services to have wrong type
  return options
}
