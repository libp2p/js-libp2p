/* eslint-env mocha */
/* eslint max-nested-callbacks: ['error', 6] */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { stop } from '@libp2p/interface'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { webTransport } from '@libp2p/webtransport'
import { multiaddr } from '@multiformats/multiaddr'
import { WebSockets, WebTransport } from '@multiformats/multiaddr-matcher'
import { createLibp2p } from 'libp2p'
import { hasRelay } from './fixtures/utils.js'
import type { Libp2p } from '@libp2p/interface'

describe('circuit-relay discovery', () => {
  let node: Libp2p

  beforeEach(async () => {
    node = await createLibp2p({
      transports: [
        webSockets({
          filter: filters.all
        }),
        circuitRelayTransport({
          discoverRelays: 1
        }),
        webTransport()
      ],
      streamMuxers: [
        yamux(),
        mplex()
      ],
      connectionEncryption: [
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
