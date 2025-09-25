/* eslint-env mocha */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import tests from '@libp2p/interface-compliance-tests/transport'
import { prefixLogger } from '@libp2p/logger'
import { webSockets } from '@libp2p/websockets'
import { CODE_P2P_CIRCUIT } from '@multiformats/multiaddr'
import { Circuit, P2P } from '@multiformats/multiaddr-matcher'
import { and, fmt, code } from '@multiformats/multiaddr-matcher/utils'

export const CircuitListen = fmt(
  and(P2P.matchers[0], code(CODE_P2P_CIRCUIT))
)

describe('Circuit relay transport interface compliance', () => {
  tests({
    async setup () {
      const dialer = {
        transports: [
          circuitRelayTransport(),
          webSockets()
        ],
        connectionEncrypters: [
          noise()
        ],
        streamMuxers: [
          yamux()
        ],
        services: {
          identify: identify()
        },
        connectionGater: {
          denyDialMultiaddr: () => false
        },
        connectionMonitor: {
          enabled: false
        },
        logger: prefixLogger('dialer')
      }

      return {
        dialer,
        listener: {
          addresses: {
            listen: [
              `${process.env.RELAY_WS_MULTIADDR_0}/p2p-circuit`,
              `${process.env.RELAY_WS_MULTIADDR_1}/p2p-circuit`
            ]
          },
          ...dialer,
          logger: prefixLogger('listener')
        },
        dialMultiaddrMatcher: Circuit,
        listenMultiaddrMatcher: CircuitListen
      }
    },
    async teardown () {}
  })
})
