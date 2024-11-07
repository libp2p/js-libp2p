/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/transport'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { multiaddr } from '@multiformats/multiaddr'
import { isElectronMain, isNode } from 'wherearewe'
import type { Multiaddr } from '@multiformats/multiaddr'

describe('websocket transport interface compliance', () => {
  tests({
    async setup () {
      const dialOnly = !isNode && !isElectronMain

      const transport = webSockets({ filter: filters.all })
      let dialAddrs: [Multiaddr, Multiaddr] = [
        multiaddr('/ip4/127.0.0.1/tcp/9096/ws'),
        multiaddr('/ip4/127.0.0.1/tcp/9097/ws')
      ]

      if (dialOnly) {
        dialAddrs = [
          multiaddr(process.env.RELAY_WS_MULTIADDR_0),
          multiaddr(process.env.RELAY_WS_MULTIADDR_1)
        ]
      }

      return {
        transport,
        listenAddrs: dialOnly ? undefined : dialAddrs,
        dialAddrs,
        dialOnly
      }
    },
    async teardown () {}
  })
})
