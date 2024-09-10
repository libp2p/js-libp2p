/* eslint-env mocha */

import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayServer, type CircuitRelayService, circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { stop } from '@libp2p/interface'
import { kadDHT, passthroughMapper } from '@libp2p/kad-dht'
import { plaintext } from '@libp2p/plaintext'
import { tcp } from '@libp2p/tcp'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import pDefer from 'p-defer'
import { getRelayAddress, hasRelay } from './fixtures/utils.js'
import type { Libp2p } from '@libp2p/interface'
import type { KadDHT } from '@libp2p/kad-dht'

const DHT_PROTOCOL = '/integration-test/circuit-relay/1.0.0'

describe('circuit-relay discovery', () => {
  let local: Libp2p
  let remote: Libp2p
  let relay: Libp2p<{ relay: CircuitRelayService }>
  let bootstrapper: Libp2p<{ kadDht: KadDHT }>

  beforeEach(async () => {
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
      connectionEncrypters: [
        plaintext()
      ],
      services: {
        relay: circuitRelayServer({
          reservations: {
            maxReservations: Infinity
          }
        }),
        identify: identify(),
        kadDht: kadDHT({
          protocol: DHT_PROTOCOL,
          peerInfoMapper: passthroughMapper,
          clientMode: false
        })
      }
    })

    bootstrapper = await createLibp2p({
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0']
      },
      transports: [
        tcp()
      ],
      streamMuxers: [
        yamux()
      ],
      connectionEncrypters: [
        plaintext()
      ],
      services: {
        identify: identify(),
        kadDht: kadDHT({
          protocol: DHT_PROTOCOL,
          peerInfoMapper: passthroughMapper,
          clientMode: false
        })
      }
    })

    // connect the bootstrapper to the relay
    await bootstrapper.dial(relay.getMultiaddrs())

    // bootstrapper should be able to locate relay via DHT
    const foundRelay = pDefer()
    void Promise.resolve().then(async () => {
      for await (const event of bootstrapper.services.kadDht.findPeer(relay.peerId)) {
        if (event.name === 'FINAL_PEER') {
          foundRelay.resolve()
        }
      }
    })
    await foundRelay.promise

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
        connectionEncrypters: [
          plaintext()
        ],
        services: {
          identify: identify(),
          kadDht: kadDHT({
            protocol: DHT_PROTOCOL,
            peerInfoMapper: passthroughMapper,
            clientMode: true
          })
        }
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
        connectionEncrypters: [
          plaintext()
        ],
        services: {
          identify: identify(),
          kadDht: kadDHT({
            protocol: DHT_PROTOCOL,
            peerInfoMapper: passthroughMapper,
            clientMode: true
          })
        }
      })
    ])

    // connect both nodes to the bootstrapper
    await Promise.all([
      local.dial(bootstrapper.getMultiaddrs()),
      remote.dial(bootstrapper.getMultiaddrs())
    ])
  })

  afterEach(async () => {
    // Stop each node
    await stop(
      local,
      remote,
      bootstrapper,
      relay
    )
  })

  it('should discover relay and add it as listen relay', async () => {
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
