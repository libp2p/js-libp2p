/* eslint-env mocha */
/* eslint max-nested-callbacks: ['error', 6] */

import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { stop } from '@libp2p/interface'
import { mplex } from '@libp2p/mplex'
import { noise } from '@libp2p/noise'
import { plaintext } from '@libp2p/plaintext'
import { webSockets } from '@libp2p/websockets'
import { webTransport } from '@libp2p/webtransport'
import { yamux } from '@libp2p/yamux'
import { multiaddr } from '@multiformats/multiaddr'
import { WebSockets, WebTransport } from '@multiformats/multiaddr-matcher'
import { createLibp2p } from 'libp2p'
import { hasRelay, isFirefox } from './fixtures/utils.js'
import type { Libp2p } from '@libp2p/interface'

describe('circuit-relay discovery', () => {
  let node: Libp2p

  beforeEach(async () => {
    node = await createLibp2p({
      addresses: {
        listen: [
          '/p2p-circuit'
        ]
      },
      transports: [
        webSockets(),
        circuitRelayTransport(),
        webTransport()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncrypters: [
        plaintext(),
        noise()
      ],
      connectionGater: {
        denyDialMultiaddr: () => false
      },
      services: {
        identify: identify()
      }
    })
  })

  afterEach(async () => {
    await stop(node)
  })

  it('should reserve slot on go relay via WebSockets', async () => {
    const ma = (process.env.GO_RELAY_MULTIADDRS ?? '')
      .split(',')
      .map(ma => multiaddr(ma))
      .filter(ma => WebSockets.matches(ma))
      .pop()

    if (ma == null) {
      throw new Error('Could not detect go relay WebSocket address')
    }

    // dial the relay
    await node.dial(ma)

    // wait for a reservation to be made
    await hasRelay(node)
  })

  it('should reserve slot on go relay via WebTransport', async function () {
    if (globalThis.WebTransport == null) {
      return this.skip()
    }

    // https://bugzilla.mozilla.org/show_bug.cgi?id=1986138
    if (isFirefox) {
      return this.skip()
    }

    const ma = (process.env.GO_RELAY_MULTIADDRS ?? '')
      .split(',')
      .map(ma => multiaddr(`${ma}/p2p/${process.env.GO_RELAY_PEER}`))
      .filter(ma => WebTransport.matches(ma))
      .pop()

    if (ma == null) {
      throw new Error('Could not detect go relay WebSocket address')
    }

    // dial the relay
    await node.dial(ma)

    // wait for a reservation to be made
    await hasRelay(node)
  })
})
