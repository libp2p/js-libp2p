/* eslint-env mocha */

import { yamux } from '@chainsafe/libp2p-yamux'
import { tcp } from '@libp2p/tcp'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { circuitRelayServer, type CircuitRelayService, circuitRelayTransport } from '../../src/circuit-relay/index.js'
import { createLibp2p } from '../../src/index.js'
import { plaintext } from '../../src/insecure/index.js'
import { getRelayAddress, hasRelay, MockContentRouting, mockContentRouting } from './utils.js'
import type { Libp2p } from '@libp2p/interface-libp2p'

describe('circuit-relay discovery', () => {
  let local: Libp2p
  let remote: Libp2p
  let relay: Libp2p<{ relay: CircuitRelayService }>

  beforeEach(async () => {
    // create relay first so it has time to advertise itself via content routing
    relay = await createLibp2p({
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0']
      },
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux()
      ],
      connectionEncryption: [
        plaintext()
      ],
      contentRouters: [
        mockContentRouting()
      ],
      services: {
        relay: circuitRelayServer({
          advertise: {
            bootDelay: 10
          }
        })
      }
    })

    // wait for relay to advertise service successfully
    await pEvent(relay.services.relay, 'relay:advert:success')

    // now create client nodes
    ;[local, remote] = await Promise.all([
      createLibp2p({
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/0']
        },
        transports: [
          tcp(),
          circuitRelayTransport({
            discoverRelays: 1
          })
        ],
        streamMuxers: [
          yamux()
        ],
        connectionEncryption: [
          plaintext()
        ],
        contentRouters: [
          mockContentRouting()
        ]
      }),
      createLibp2p({
        addresses: {
          listen: ['/ip4/127.0.0.1/tcp/0']
        },
        transports: [
          tcp(),
          circuitRelayTransport({
            discoverRelays: 1
          })
        ],
        streamMuxers: [
          yamux()
        ],
        connectionEncryption: [
          plaintext()
        ],
        contentRouters: [
          mockContentRouting()
        ]
      })
    ])
  })

  afterEach(async () => {
    MockContentRouting.reset()

    // Stop each node
    return Promise.all([local, remote, relay].map(async libp2p => {
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
