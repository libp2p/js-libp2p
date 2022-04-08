/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import defer from 'p-defer'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import nock from 'nock'
import { create as createIpfsHttpClient } from 'ipfs-http-client'
import { DelegatedContentRouting } from '@libp2p/delegated-content-routing'
import { protocolIDv2Hop } from '../../src/circuit/multicodec.js'
import { createNode } from '../utils/creators/peer.js'
import type { Libp2pNode } from '../../src/libp2p.js'
import type { Options as PWaitForOptions } from 'p-wait-for'
import type Sinon from 'sinon'
import { createRelayOptions, createNodeOptions } from './utils.js'
import { protocols } from '@multiformats/multiaddr'

async function usingAsRelay (node: Libp2pNode, relay: Libp2pNode, opts?: PWaitForOptions) {
  // Wait for peer to be used as a relay
  await pWaitFor(() => {
    for (const addr of node.getMultiaddrs()) {
      if (addr.toString().includes(`${relay.peerId.toString()}/p2p-circuit`)) {
        return true
      }
    }

    return false
  }, opts)
}

async function discoveredRelayConfig (node: Libp2pNode, relay: Libp2pNode) {
  await pWaitFor(async () => {
    const peerData = await node.peerStore.get(relay.peerId)
    const supportsRelay = peerData.protocols.includes(protocolIDv2Hop)
    const supportsHop = peerData.metadata.has('hop_relay')

    return supportsRelay && supportsHop
  })
}

describe.skip('auto-relay', () => {
  describe('basics', () => {
    let libp2p: Libp2pNode
    let relayLibp2p: Libp2pNode

    beforeEach(async () => {
      // Create 2 nodes, and turn HOP on for the relay
      libp2p = await createNode({
        config: createNodeOptions()
      })
      relayLibp2p = await createNode({
        config: createRelayOptions()
      })
    })

    beforeEach(async () => {
      // Start each node
      return await Promise.all([libp2p, relayLibp2p].map(async libp2p => await libp2p.start()))
    })

    afterEach(async () => {
      // Stop each node
      return await Promise.all([libp2p, relayLibp2p].map(async libp2p => await libp2p.stop()))
    })

    it('should ask if node supports hop on protocol change (relay protocol) and add to listen multiaddrs', async () => {
      // Discover relay
      await libp2p.peerStore.addressBook.add(relayLibp2p.peerId, relayLibp2p.getMultiaddrs())
      await libp2p.dial(relayLibp2p.peerId)

      // Wait for peer added as listen relay
      await discoveredRelayConfig(libp2p, relayLibp2p)

      // Wait to start using peer as a relay
      await usingAsRelay(libp2p, relayLibp2p)

      // Peer has relay multicodec
      const knownProtocols = await libp2p.peerStore.protoBook.get(relayLibp2p.peerId)
      expect(knownProtocols).to.include(protocolIDv2Hop)
    })
  })

  describe('flows with 1 listener max', () => {
    let libp2p: Libp2pNode
    let relayLibp2p1: Libp2pNode
    let relayLibp2p2: Libp2pNode
    let relayLibp2p3: Libp2pNode

    beforeEach(async () => {
      // Create 4 nodes, and turn HOP on for the relay
      [libp2p, relayLibp2p1, relayLibp2p2, relayLibp2p3] = await Promise.all([
        createNode({ config: createNodeOptions() }),
        createNode({ config: createRelayOptions() }),
        createNode({ config: createRelayOptions() }),
        createNode({ config: createRelayOptions() })
      ])

      // Start each node
      await Promise.all([libp2p, relayLibp2p1, relayLibp2p2, relayLibp2p3].map(async libp2p => await libp2p.start()))
    })

    afterEach(async () => {
      // Stop each node
      return await Promise.all([libp2p, relayLibp2p1, relayLibp2p2, relayLibp2p3].map(async libp2p => await libp2p.stop()))
    })

    it('should ask if node supports hop on protocol change (relay protocol) and add to listen multiaddrs', async () => {
      // Discover relay
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.getMultiaddrs())
      await relayLibp2p1.dial(relayLibp2p2.peerId)
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p2)

      // Wait for peer added as listen relay
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // Peer has relay multicodec
      const knownProtocols = await relayLibp2p1.peerStore.protoBook.get(relayLibp2p2.peerId)
      expect(knownProtocols).to.include(protocolIDv2Hop)
    })

    it('should be able to dial a peer from its relayed address previously added', async () => {
      // Discover relay
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.getMultiaddrs())
      await relayLibp2p1.dial(relayLibp2p2.peerId)
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p2)

      // Wait for peer added as listen relay
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // Dial from the other through a relay
      const relayedMultiaddr2 = relayLibp2p1.getMultiaddrs()[0].encapsulate('/p2p-circuit')
      await libp2p.peerStore.addressBook.add(relayLibp2p2.peerId, [relayedMultiaddr2])
      await libp2p.dial(relayLibp2p2.peerId)
    })

    it('should only add maxListeners relayed addresses', async () => {
      // Discover one relay and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.getMultiaddrs())
      await relayLibp2p1.dial(relayLibp2p2.peerId)
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p2)

      // Wait for peer added as listen relay
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // Relay2 has relay multicodec
      const knownProtocols2 = await relayLibp2p1.peerStore.protoBook.get(relayLibp2p2.peerId)
      expect(knownProtocols2).to.include(protocolIDv2Hop)

      // Discover an extra relay and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.getMultiaddrs())
      await relayLibp2p1.dial(relayLibp2p3.peerId)
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p3)

      // Wait to guarantee the dialed peer is not added as a listen relay
      await expect(usingAsRelay(relayLibp2p1, relayLibp2p3, {
        timeout: 1000
      })).to.eventually.be.rejected()

      // Relay2 has relay multicodec
      const knownProtocols3 = await relayLibp2p1.peerStore.protoBook.get(relayLibp2p3.peerId)
      expect(knownProtocols3).to.include(protocolIDv2Hop)
    })

    it('should not listen on a relayed address we disconnect from peer', async () => {
      if (relayLibp2p1.identifyService == null) {
        throw new Error('Identify service not configured')
      }

      // Spy if identify push is fired on adding/removing listen addr
      sinon.spy(relayLibp2p1.identifyService, 'pushToPeerStore')

      // Discover one relay and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.getMultiaddrs())
      await relayLibp2p1.dial(relayLibp2p2.peerId)
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p2)

      // Wait for listening on the relay
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // Disconnect from peer used for relay
      await relayLibp2p1.hangUp(relayLibp2p2.peerId)

      // Wait for removed listening on the relay
      await expect(usingAsRelay(relayLibp2p1, relayLibp2p2, {
        timeout: 1000
      })).to.eventually.be.rejected()
    })

    it('should try to listen on other connected peers relayed address if one used relay disconnects', async () => {
      // Discover one relay and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.getMultiaddrs())
      await relayLibp2p1.dial(relayLibp2p2.peerId)
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p2)
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // Discover an extra relay and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.getMultiaddrs())
      await relayLibp2p1.dial(relayLibp2p3.peerId)
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p3)

      // Only one will be used for listening
      await expect(usingAsRelay(relayLibp2p1, relayLibp2p3, {
        timeout: 1000
      })).to.eventually.be.rejected()

      // Disconnect from peer used for relay
      await relayLibp2p2.stop()

      // Should not be using the relay any more
      await expect(usingAsRelay(relayLibp2p1, relayLibp2p2, {
        timeout: 1000
      })).to.eventually.be.rejected()

      // Wait for other peer connected to be added as listen addr
      await usingAsRelay(relayLibp2p1, relayLibp2p3)
    })

    it('should try to listen on stored peers relayed address if one used relay disconnects and there are not enough connected', async () => {
      // Discover one relay and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.getMultiaddrs())
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Wait for peer to be used as a relay
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // Discover an extra relay and connect to gather its Hop support
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.getMultiaddrs())
      await relayLibp2p1.dial(relayLibp2p3.peerId)

      // wait for identify for newly dialled peer
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p3)

      // Disconnect not used listen relay
      await relayLibp2p1.hangUp(relayLibp2p3.peerId)

      // Remove peer used as relay from peerStore and disconnect it
      await relayLibp2p1.hangUp(relayLibp2p2.peerId)
      await relayLibp2p1.peerStore.delete(relayLibp2p2.peerId)
      await pWaitFor(() => relayLibp2p1.getConnections().length === 0)

      // Wait for other peer connected to be added as listen addr
      await usingAsRelay(relayLibp2p1, relayLibp2p3)
    })

    it('should not fail when trying to dial unreachable peers to add as hop relay and replaced removed ones', async () => {
      const deferred = defer()

      // Discover one relay and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.getMultiaddrs())
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Discover an extra relay and connect to gather its Hop support
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.getMultiaddrs())
      await relayLibp2p1.dial(relayLibp2p3.peerId)

      // Wait for peer to be used as a relay
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // wait for identify for newly dialled peer
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p3)

      // Disconnect not used listen relay
      await relayLibp2p1.hangUp(relayLibp2p3.peerId)

      // Stub dial
      sinon.stub(relayLibp2p1.components.getDialer(), 'dial').callsFake(async () => {
        deferred.resolve()
        return await Promise.reject(new Error('failed to dial'))
      })

      // Remove peer used as relay from peerStore and disconnect it
      await relayLibp2p1.hangUp(relayLibp2p2.peerId)
      await relayLibp2p1.peerStore.delete(relayLibp2p2.peerId)
      expect(relayLibp2p1.getConnections()).to.be.empty()

      // Wait for failed dial
      await deferred.promise
    })
  })

  describe('flows with 2 max listeners', () => {
    let relayLibp2p1: Libp2pNode
    let relayLibp2p2: Libp2pNode
    let relayLibp2p3: Libp2pNode

    beforeEach(async () => {
      // Create 3 nodes, and turn HOP on for the relay
      [relayLibp2p1, relayLibp2p2, relayLibp2p3] = await Promise.all([
        createNode({ config: createRelayOptions() }),
        createNode({ config: createRelayOptions() }),
        createNode({ config: createRelayOptions() })
      ])

      // Start each node
      await Promise.all([relayLibp2p1, relayLibp2p2, relayLibp2p3].map(async libp2p => await libp2p.start()))
    })

    afterEach(async () => {
      // Stop each node
      return await Promise.all([relayLibp2p1, relayLibp2p2, relayLibp2p3].map(async libp2p => await libp2p.stop()))
    })

    it('should not add listener to a already relayed connection', async () => {
      // Relay 1 discovers Relay 3 and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.getMultiaddrs())
      await relayLibp2p1.dial(relayLibp2p3.peerId)
      await usingAsRelay(relayLibp2p1, relayLibp2p3)

      // Relay 2 discovers Relay 3 and connect
      await relayLibp2p2.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.getMultiaddrs())
      await relayLibp2p2.dial(relayLibp2p3.peerId)
      await usingAsRelay(relayLibp2p2, relayLibp2p3)

      // Relay 1 discovers Relay 2 relayed multiaddr via Relay 3
      const ma2RelayedBy3 = relayLibp2p2.getMultiaddrs()[relayLibp2p2.getMultiaddrs().length - 1]
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, [ma2RelayedBy3])
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Peer not added as listen relay
      await expect(usingAsRelay(relayLibp2p1, relayLibp2p2, {
        timeout: 1000
      })).to.eventually.be.rejected()
    })
  })

  describe('discovery', () => {
    let local: Libp2pNode
    let remote: Libp2pNode
    let relayLibp2p: Libp2pNode
    let contentRoutingProvideSpy: Sinon.SinonSpy

    beforeEach(async () => {
      const delegate = new DelegatedContentRouting(createIpfsHttpClient({
        host: '0.0.0.0',
        protocol: 'http',
        port: 60197
      }))

      ;[local, remote, relayLibp2p] = await Promise.all([
        createNode({
          config: createNodeOptions({
            contentRouters: [
              delegate
            ]
          })
        }),
        createNode({
          config: createNodeOptions({
            contentRouters: [
              delegate
            ]
          })
        }),
        createNode({
          config: createRelayOptions({
            relay: {
              advertise: {
                bootDelay: 1000,
                ttl: 1000,
                enabled: true
              },
              autoRelay: {
                enabled: true,
                maxListeners: 1
              }
            },
            contentRouters: [
              delegate
            ]
          })
        })
      ])

      contentRoutingProvideSpy = sinon.spy(relayLibp2p.contentRouting, 'provide')
    })

    beforeEach(async () => {
      nock('http://0.0.0.0:60197')
        // mock the refs call
        .post('/api/v0/refs')
        .query(true)
        .reply(200, undefined, [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])

      // Start each node
      await Promise.all([local, remote, relayLibp2p].map(async libp2p => await libp2p.start()))

      // Should provide on start
      await pWaitFor(() => contentRoutingProvideSpy.callCount === 1)

      const provider = relayLibp2p.peerId.toString()
      const multiaddrs = relayLibp2p.getMultiaddrs().map(ma => ma.decapsulateCode(protocols('p2p').code))

      // Mock findProviders
      nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/findprovs')
        .query(true)
        .reply(200, `{"Extra":"","ID":"${provider}","Responses":[{"Addrs":${JSON.stringify(multiaddrs)},"ID":"${provider}"}],"Type":4}\n`, [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])
    })

    afterEach(async () => {
      // Stop each node
      return await Promise.all([local, remote, relayLibp2p].map(async libp2p => await libp2p.stop()))
    })

    it('should find providers for relay and add it as listen relay', async () => {
      const originalMultiaddrsLength = local.getMultiaddrs().length

      // Spy Find Providers
      const contentRoutingFindProvidersSpy = sinon.spy(local.contentRouting, 'findProviders')

      const relayAddr = relayLibp2p.getMultiaddrs().pop()

      if (relayAddr == null) {
        throw new Error('Relay had no addresses')
      }

      // connect to relay
      await local.dial(relayAddr)

      // should start using the relay
      await usingAsRelay(local, relayLibp2p)

      // disconnect from relay, should start looking for new relays
      await local.hangUp(relayAddr)

      // Should try to find relay service providers
      await pWaitFor(() => contentRoutingFindProvidersSpy.callCount === 1)

      // Wait for peer added as listen relay
      await pWaitFor(() => local.getMultiaddrs().length === originalMultiaddrsLength + 1)

      const relayedAddr = local.getMultiaddrs()[local.getMultiaddrs().length - 1]
      await remote.peerStore.addressBook.set(local.peerId, [relayedAddr])

      // Dial from remote through the relayed address
      const conn = await remote.dial(local.peerId)

      expect(conn).to.exist()
    })
  })
})
