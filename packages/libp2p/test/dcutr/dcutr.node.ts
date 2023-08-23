/* eslint-env mocha */

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pRetry from 'p-retry'
import { circuitRelayServer, type CircuitRelayService } from '../../src/circuit-relay/index.js'
import { dcutrService } from '../../src/dcutr/index.js'
import { identifyService } from '../../src/identify/index.js'
import { createLibp2pNode } from '../../src/libp2p.js'
import { usingAsRelay } from '../circuit-relay/utils.js'
import { createBaseOptions } from '../fixtures/base-options.js'
import type { Libp2p } from '@libp2p/interface'

const RELAY_PORT = 47330
const LOCAL_PORT = 47331
const REMOTE_PORT = 47332

describe('dcutr', () => {
  let relay: Libp2p<{ identify: unknown, relay: CircuitRelayService }>
  let libp2pA: Libp2p<{ identify: unknown, dcutr: unknown }>
  let libp2pB: Libp2p<{ identify: unknown, dcutr: unknown }>

  async function waitForOnlyDirectConnections (): Promise<void> {
    await pRetry(async () => {
      const connections = libp2pA.getConnections(libp2pB.peerId)
      const onlyDirect = connections.filter(conn => !conn.transient)
      if (onlyDirect.length === connections.length) {
        // all connections are direct
        return true
      }

      // wait a bit before trying again
      await delay(1000)

      throw new Error('Did not upgrade connection')
    }, {
      retries: 10
    })
  }

  beforeEach(async () => {
    relay = await createLibp2pNode(createBaseOptions({
      addresses: {
        listen: [`/ip4/0.0.0.0/tcp/${RELAY_PORT}`]
      },
      services: {
        identify: identifyService(),
        relay: circuitRelayServer()
      }
    }))

    await relay.start()
  })

  afterEach(async () => {
    if (relay != null) {
      await relay.stop()
    }
  })

  describe('unilateral connection upgrade', () => {
    beforeEach(async () => {
      libp2pA = await createLibp2pNode(createBaseOptions({
        addresses: {
          // A should have a publicly dialable address
          announce: [`/dns4/localhost/tcp/${LOCAL_PORT}`],
          listen: [`/ip4/0.0.0.0/tcp/${LOCAL_PORT}`]
        },
        services: {
          identify: identifyService(),
          dcutr: dcutrService()
        }
      }))
      libp2pB = await createLibp2pNode(createBaseOptions({
        addresses: {
          listen: [
            `/ip4/0.0.0.0/tcp/${REMOTE_PORT}`,
            `/ip4/127.0.0.1/tcp/${RELAY_PORT}/p2p/${relay.peerId}/p2p-circuit`
          ]
        },
        services: {
          identify: identifyService(),
          dcutr: dcutrService()
        }
      }))

      await libp2pA.start()
      await libp2pB.start()

      // wait for B to have a relay address
      await usingAsRelay(libp2pB, relay)
    })

    afterEach(async () => {
      if (libp2pA != null) {
        await libp2pA.stop()
      }

      if (libp2pB != null) {
        await libp2pB.stop()
      }
    })

    it('should upgrade the connection when A has dialed B via a relay but also has a publicly dialable address', async () => {
      const relayedAddress = multiaddr(`/ip4/127.0.0.1/tcp/${RELAY_PORT}/p2p/${relay.peerId}/p2p-circuit/p2p/${libp2pB.peerId}`)
      const connection = await libp2pA.dial(relayedAddress)

      // connection should be transient
      expect(connection).to.have.property('transient', true)

      // wait for DCUtR unilateral upgrade
      await waitForOnlyDirectConnections()

      // should have closed the relayed connection
      expect(libp2pA.getConnections(libp2pB.peerId)).to.have.lengthOf(1, 'had multiple connections to remote peer')
    })
  })

  // TODO: how to test this?
  describe('DCUtR connection upgrade for TCP', () => {
    beforeEach(async () => {
      // based on https://github.com/ipfs/helia/issues/182#issuecomment-1653860165
      // libp2pA is the gateway
      libp2pA = await createLibp2pNode(createBaseOptions({
        addresses: {
          listen: [`/ip4/0.0.0.0/tcp/${LOCAL_PORT}`]
        },
        services: {
          identify: identifyService(),
          dcutr: dcutrService()
        },
        connectionManager: {
          minConnections: 0 // disable autodial
        }
      }))
      // libp2pB is the browser node
      libp2pB = await createLibp2pNode(createBaseOptions({
        addresses: {
          listen: [
            `/ip4/0.0.0.0/tcp/${REMOTE_PORT}`,
            `/ip4/127.0.0.1/tcp/${RELAY_PORT}/p2p/${relay.peerId}/p2p-circuit`
          ]
        },
        services: {
          identify: identifyService(),
          dcutr: dcutrService()
        }
      }))

      await libp2pA.start()
      await libp2pB.start()

      // wait for B to have a relay address
      await usingAsRelay(libp2pB, relay)
    })

    afterEach(async () => {
      if (libp2pA != null) {
        await libp2pA.stop()
      }

      if (libp2pB != null) {
        await libp2pB.stop()
      }
    })

    it('should perform connection upgrade', async () => {
      const relayedAddress = multiaddr(`/ip4/127.0.0.1/tcp/${RELAY_PORT}/p2p/${relay.peerId}/p2p-circuit/p2p/${libp2pB.peerId}`)
      const connection = await libp2pA.dial(relayedAddress)

      // connection should be transient
      expect(connection).to.have.property('transient', true)

      // wait for the relayedAddress connection to be closed
      const closedRelayConnection = async (): Promise<boolean> => pRetry(async () => {
        if (connection.status !== 'closed') {
          throw new Error('relayed connection is still open')
        }
        return true
      }, {
        retries: 10
      })
      await expect(closedRelayConnection()).to.eventually.equal(true)

      // wait for DCUtR unilateral upgrade
      await waitForOnlyDirectConnections()

      // should have closed the relayed connection
      expect(libp2pA.getConnections(libp2pB.peerId)).to.have.lengthOf(1, 'had multiple connections to remote peer')
    })
  })
})
