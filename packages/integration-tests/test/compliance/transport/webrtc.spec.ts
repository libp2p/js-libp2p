/* eslint-env mocha */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import tests from '@libp2p/interface-compliance-tests/transport'
import { ping } from '@libp2p/ping'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { WebRTC } from '@multiformats/multiaddr-matcher'
import { isWebWorker } from 'wherearewe'
import { isFirefox } from '../../fixtures/utils.js'

describe('WebRTC transport interface compliance', () => {
  if (isWebWorker) {
    return
  }

  if (process?.env?.CI != null && isFirefox) {
    // FireFox cannot dial loopback addresses and CI doesn't always have others
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
