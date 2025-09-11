/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/transport'
import { noise } from '@libp2p/noise'
import { webSockets } from '@libp2p/websockets'
import { yamux } from '@libp2p/yamux'
import { multiaddr } from '@multiformats/multiaddr'
import { WebSockets } from '@multiformats/multiaddr-matcher'
import { isElectronMain, isNode } from 'wherearewe'

describe('websocket transport interface compliance', () => {
  tests({
    async setup () {
      const canListen = isNode || isElectronMain

      const dialer = {
        transports: [
          webSockets()
        ],
        connectionEncrypters: [
          noise()
        ],
        streamMuxers: [
          yamux()
        ],
        connectionGater: {
          denyDialMultiaddr: () => false
        },
        connectionMonitor: {
          enabled: false
        }
      }

      return {
        dialer,
        listener: canListen
          ? {
              addresses: {
                listen: [
                  '/ip4/127.0.0.1/tcp/0/ws',
                  '/ip4/127.0.0.1/tcp/0/ws'
                ]
              },
              ...dialer
            }
          : undefined,
        dialAddrs: canListen
          ? undefined
          : [
              multiaddr(process.env.RELAY_WS_MULTIADDR_0 ?? ''),
              multiaddr(process.env.RELAY_WS_MULTIADDR_1 ?? '')
            ],
        dialMultiaddrMatcher: WebSockets,
        listenMultiaddrMatcher: WebSockets
      }
    },
    async teardown () {}
  })
})
