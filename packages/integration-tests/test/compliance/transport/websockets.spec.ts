/* eslint-env mocha */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import tests from '@libp2p/interface-compliance-tests/transport'
import { webSockets } from '@libp2p/websockets'
import { all } from '@libp2p/websockets/filters'
import { multiaddr } from '@multiformats/multiaddr'
import { WebSockets } from '@multiformats/multiaddr-matcher'
import { isElectronMain, isNode } from 'wherearewe'

describe('websocket transport interface compliance', () => {
  tests({
    async setup () {
      const canListen = isNode || isElectronMain

      const dialer = {
        transports: [
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
