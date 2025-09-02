/* eslint-env mocha */

import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import tests from '@libp2p/interface-compliance-tests/transport'
import { noise } from '@libp2p/noise'
import { ping } from '@libp2p/ping'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { yamux } from '@libp2p/yamux'
import { WebRTC } from '@multiformats/multiaddr-matcher'
import { isWebWorker } from 'wherearewe'
import { isFirefox } from '../../fixtures/utils.ts'

describe('WebRTC transport interface compliance', () => {
  if (isWebWorker || (process.env.CI != null && isFirefox)) {
    return
  }

  tests({
    async setup () {
      const dialer = {
        transports: [
          circuitRelayTransport(),
          webSockets(),
          webRTC()
        ],
        connectionEncrypters: [
          noise()
        ],
        streamMuxers: [
          yamux()
        ],
        services: {
          identify: identify(),
          ping: ping()
        },
        connectionGater: {
          denyDialMultiaddr: () => false
        },
        connectionMonitor: {
          enabled: false
        }
      }

      return {
        dialer,
        listener: {
          addresses: {
            listen: [
              `${process.env.RELAY_WS_MULTIADDR_0}/p2p-circuit`,
              `${process.env.RELAY_WS_MULTIADDR_1}/p2p-circuit`,
              '/webrtc'
            ]
          },
          ...dialer
        },
        dialMultiaddrMatcher: WebRTC,
        listenMultiaddrMatcher: WebRTC
      }
    },
    async teardown () {}
  })
})
