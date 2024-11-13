/* eslint-env mocha */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import tests from '@libp2p/interface-compliance-tests/transport'
import { webSockets } from '@libp2p/websockets'
import { all } from '@libp2p/websockets/filters'
import { Circuit, P2P } from '@multiformats/multiaddr-matcher'
import { and, fmt, literal } from '@multiformats/multiaddr-matcher/utils'

export const CircuitListen = fmt(
  and(P2P.matchers[0], literal('p2p-circuit'))
)

describe('Circuit relay transport interface compliance', () => {
  tests({
    async setup () {
      const dialer = {
        transports: [
          circuitRelayTransport(),
          webSockets({
            filter: all
          })
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
        }
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
          ...dialer
        },
        dialMultiaddrMatcher: Circuit,
        listenMultiaddrMatcher: CircuitListen
      }
    },
    async teardown () {}
  })
})