/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { createNode } from '../utils/creators/peer.js'
import type { Libp2pNode } from '../../src/libp2p.js'
import { createNodeOptions, getRelayAddress, hasRelay, MockContentRouting, mockContentRouting } from './utils.js'
import { circuitRelayServer, circuitRelayTransport } from '../../src/circuit-relay/index.js'
import { tcp } from '@libp2p/tcp'
import { pEvent } from 'p-event'

describe('circuit-relay discovery', () => {
  let local: Libp2pNode
  let remote: Libp2pNode
  let relay: Libp2pNode

  beforeEach(async () => {
    // create relay first so it has time to advertise itself via content routing
    relay = await createNode({
      config: createNodeOptions({
        transports: [
          tcp()
        ],
        relay: circuitRelayServer({
          advertise: {
            bootDelay: 10
          }
        }),
        contentRouters: [
          mockContentRouting()
        ]
      })
    })

    if (relay.circuitService != null) {
      // wait for relay to advertise service successfully
      await pEvent(relay.circuitService, 'relay:advert:success')
    }

    // now create client nodes
    [local, remote] = await Promise.all([
      createNode({
        config: createNodeOptions({
          transports: [
            tcp(),
            circuitRelayTransport({
              discoverRelays: 1
            })
          ],
          contentRouters: [
            mockContentRouting()
          ]
        })
      }),
      createNode({
        config: createNodeOptions({
          transports: [
            tcp(),
            circuitRelayTransport({
              discoverRelays: 1
            })
          ],
          contentRouters: [
            mockContentRouting()
          ]
        })
      })
    ])
  })

  afterEach(async () => {
    MockContentRouting.reset()

    // Stop each node
    return await Promise.all([local, remote, relay].map(async libp2p => {
      if (libp2p != null) {
        await libp2p.stop()
      }
    }))
  })

  it('should find provider for relay and add it as listen relay', async () => {
    // both nodes should discover the relay - they have no direct connection
    // so it will be via content routing
    const localRelayPeerId = await hasRelay(local)
    expect(localRelayPeerId.toString()).to.equal(relay.peerId.toString())

    const remoteRelayPeerId = await hasRelay(remote)
    expect(remoteRelayPeerId.toString()).to.equal(relay.peerId.toString())

    const relayedAddr = getRelayAddress(remote)
    // Dial from remote through the relayed address
    const conn = await local.dial(relayedAddr)

    expect(conn).to.exist()
  })
})
