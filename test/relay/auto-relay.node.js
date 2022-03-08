'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const defer = require('p-defer')
const pWaitFor = require('p-wait-for')
const sinon = require('sinon')
const nock = require('nock')

const ipfsHttpClient = require('ipfs-http-client')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')
const { Multiaddr } = require('multiaddr')
const Libp2p = require('../../src')
const { relayV1: relayMulticodec } = require('../../src/circuit/multicodec')

const { createPeerId } = require('../utils/creators/peer')
const baseOptions = require('../utils/base-options')

const listenAddr = '/ip4/0.0.0.0/tcp/0'

async function usingAsRelay (node, relay, opts) {
  // Wait for peer to be used as a relay
  await pWaitFor(() => {
    for (const addr of node.multiaddrs) {
      if (addr.toString().includes(`${relay.peerId.toB58String()}/p2p-circuit`)) {
        return true
      }
    }

    return false
  }, opts)
}

async function discoveredRelayConfig (node, relay) {
  await pWaitFor(async () => {
    const protos = await node.peerStore.protoBook.get(relay.peerId)
    const supportsRelay = protos.includes('/libp2p/circuit/relay/0.1.0')

    const metadata = await node.peerStore.metadataBook.get(relay.peerId)
    const supportsHop = metadata.has('hop_relay')

    return supportsRelay && supportsHop
  })
}

// TODO: replace with circuit v2 stuff
describe.skip('auto-relay', () => {
  describe('basics', () => {
    let libp2p
    let relayLibp2p

    beforeEach(async () => {
      const peerIds = await createPeerId({ number: 2 })
      // Create 2 nodes, and turn HOP on for the relay
      ;[libp2p, relayLibp2p] = peerIds.map((peerId, index) => {
        const opts = {
          ...baseOptions,
          config: {
            ...baseOptions.config,
            relay: {
              hop: {
                enabled: index !== 0
              },
              autoRelay: {
                enabled: true,
                maxListeners: 1
              }
            }
          }
        }

        return new Libp2p({
          ...opts,
          addresses: {
            listen: [listenAddr]
          },
          connectionManager: {
            autoDial: false
          },
          peerDiscovery: {
            autoDial: false
          },
          peerId
        })
      })
    })

    beforeEach(() => {
      // Start each node
      return Promise.all([libp2p, relayLibp2p].map(libp2p => libp2p.start()))
    })

    afterEach(() => {
      // Stop each node
      return Promise.all([libp2p, relayLibp2p].map(libp2p => libp2p.stop()))
    })

    it('should ask if node supports hop on protocol change (relay protocol) and add to listen multiaddrs', async () => {
      // Discover relay
      await libp2p.peerStore.addressBook.add(relayLibp2p.peerId, relayLibp2p.multiaddrs)
      await libp2p.dial(relayLibp2p.peerId)

      // Wait for peer added as listen relay
      await discoveredRelayConfig(libp2p, relayLibp2p)

      // Wait to start using peer as a relay
      await usingAsRelay(libp2p, relayLibp2p)

      // Peer has relay multicodec
      const knownProtocols = await libp2p.peerStore.protoBook.get(relayLibp2p.peerId)
      expect(knownProtocols).to.include(relayMulticodec)
    })
  })

  describe('flows with 1 listener max', () => {
    let libp2p
    let relayLibp2p1
    let relayLibp2p2
    let relayLibp2p3

    beforeEach(async () => {
      const peerIds = await createPeerId({ number: 4 })
      // Create 4 nodes, and turn HOP on for the relay
      ;[libp2p, relayLibp2p1, relayLibp2p2, relayLibp2p3] = peerIds.map((peerId, index) => {
        let opts = baseOptions

        if (index !== 0) {
          opts = {
            ...baseOptions,
            config: {
              ...baseOptions.config,
              relay: {
                hop: {
                  enabled: true
                },
                autoRelay: {
                  enabled: true,
                  maxListeners: 1
                }
              }
            }
          }
        }

        return new Libp2p({
          ...opts,
          addresses: {
            listen: [listenAddr]
          },
          connectionManager: {
            autoDial: false
          },
          peerDiscovery: {
            autoDial: false
          },
          peerId
        })
      })
    })

    beforeEach(() => {
      // Start each node
      return Promise.all([libp2p, relayLibp2p1, relayLibp2p2, relayLibp2p3].map(libp2p => libp2p.start()))
    })

    afterEach(() => {
      // Stop each node
      return Promise.all([libp2p, relayLibp2p1, relayLibp2p2, relayLibp2p3].map(libp2p => libp2p.stop()))
    })

    it('should ask if node supports hop on protocol change (relay protocol) and add to listen multiaddrs', async () => {
      // Discover relay
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p2.peerId)
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p2)

      // Wait for peer added as listen relay
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // Peer has relay multicodec
      const knownProtocols = await relayLibp2p1.peerStore.protoBook.get(relayLibp2p2.peerId)
      expect(knownProtocols).to.include(relayMulticodec)
    })

    it('should be able to dial a peer from its relayed address previously added', async () => {
      // Discover relay
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p2.peerId)
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p2)

      // Wait for peer added as listen relay
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // Dial from the other through a relay
      const relayedMultiaddr2 = new Multiaddr(`${relayLibp2p1.multiaddrs[0]}/p2p/${relayLibp2p1.peerId.toB58String()}/p2p-circuit`)
      await libp2p.peerStore.addressBook.add(relayLibp2p2.peerId, [relayedMultiaddr2])
      await libp2p.dial(relayLibp2p2.peerId)
    })

    it('should only add maxListeners relayed addresses', async () => {
      // Discover one relay and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p2.peerId)
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p2)

      // Wait for peer added as listen relay
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // Relay2 has relay multicodec
      const knownProtocols2 = await relayLibp2p1.peerStore.protoBook.get(relayLibp2p2.peerId)
      expect(knownProtocols2).to.include(relayMulticodec)

      // Discover an extra relay and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p3.peerId)
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p3)

      // Wait to guarantee the dialed peer is not added as a listen relay
      await expect(usingAsRelay(relayLibp2p1, relayLibp2p3, {
        timeout: 1000
      })).to.eventually.be.rejected()

      // Relay2 has relay multicodec
      const knownProtocols3 = await relayLibp2p1.peerStore.protoBook.get(relayLibp2p3.peerId)
      expect(knownProtocols3).to.include(relayMulticodec)
    })

    it('should not listen on a relayed address we disconnect from peer', async () => {
      // Spy if identify push is fired on adding/removing listen addr
      sinon.spy(relayLibp2p1.identifyService, 'pushToPeerStore')

      // Discover one relay and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
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
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p2.peerId)
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p2)
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // Discover an extra relay and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.multiaddrs)
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
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Wait for peer to be used as a relay
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // Discover an extra relay and connect to gather its Hop support
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p3.peerId)

      // wait for identify for newly dialled peer
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p3)

      // Disconnect not used listen relay
      await relayLibp2p1.hangUp(relayLibp2p3.peerId)

      // Remove peer used as relay from peerStore and disconnect it
      await relayLibp2p1.hangUp(relayLibp2p2.peerId)
      await relayLibp2p1.peerStore.delete(relayLibp2p2.peerId)
      await pWaitFor(() => relayLibp2p1.connectionManager.size === 0)

      // Wait for other peer connected to be added as listen addr
      await usingAsRelay(relayLibp2p1, relayLibp2p3)
    })

    it('should not fail when trying to dial unreachable peers to add as hop relay and replaced removed ones', async () => {
      const deferred = defer()

      // Discover one relay and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Discover an extra relay and connect to gather its Hop support
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p3.peerId)

      // Wait for peer to be used as a relay
      await usingAsRelay(relayLibp2p1, relayLibp2p2)

      // wait for identify for newly dialled peer
      await discoveredRelayConfig(relayLibp2p1, relayLibp2p3)

      // Disconnect not used listen relay
      await relayLibp2p1.hangUp(relayLibp2p3.peerId)

      // Stub dial
      sinon.stub(relayLibp2p1, 'dial').callsFake(() => {
        deferred.resolve()
        return Promise.reject(new Error('failed to dial'))
      })

      // Remove peer used as relay from peerStore and disconnect it
      await relayLibp2p1.hangUp(relayLibp2p2.peerId)
      await relayLibp2p1.peerStore.delete(relayLibp2p2.peerId)
      expect(relayLibp2p1.connectionManager.size).to.equal(0)

      // Wait for failed dial
      await deferred.promise
    })
  })

  describe('flows with 2 max listeners', () => {
    let relayLibp2p1
    let relayLibp2p2
    let relayLibp2p3

    beforeEach(async () => {
      const peerIds = await createPeerId({ number: 3 })
      // Create 3 nodes, and turn HOP on for the relay
      ;[relayLibp2p1, relayLibp2p2, relayLibp2p3] = peerIds.map((peerId) => {
        return new Libp2p({
          ...baseOptions,
          config: {
            ...baseOptions.config,
            relay: {
              ...baseOptions.config.relay,
              hop: {
                enabled: true
              },
              autoRelay: {
                enabled: true,
                maxListeners: 2
              }
            }
          },
          addresses: {
            listen: [listenAddr]
          },
          connectionManager: {
            autoDial: false
          },
          peerDiscovery: {
            autoDial: false
          },
          peerId
        })
      })
    })

    beforeEach(() => {
      // Start each node
      return Promise.all([relayLibp2p1, relayLibp2p2, relayLibp2p3].map(libp2p => libp2p.start()))
    })

    afterEach(() => {
      // Stop each node
      return Promise.all([relayLibp2p1, relayLibp2p2, relayLibp2p3].map(libp2p => libp2p.stop()))
    })

    it('should not add listener to a already relayed connection', async () => {
      // Relay 1 discovers Relay 3 and connect
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p3.peerId)
      await usingAsRelay(relayLibp2p1, relayLibp2p3)

      // Relay 2 discovers Relay 3 and connect
      await relayLibp2p2.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.multiaddrs)
      await relayLibp2p2.dial(relayLibp2p3.peerId)
      await usingAsRelay(relayLibp2p2, relayLibp2p3)

      // Relay 1 discovers Relay 2 relayed multiaddr via Relay 3
      const ma2RelayedBy3 = relayLibp2p2.multiaddrs[relayLibp2p2.multiaddrs.length - 1]
      await relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, [ma2RelayedBy3])
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Peer not added as listen relay
      await expect(usingAsRelay(relayLibp2p1, relayLibp2p2, {
        timeout: 1000
      })).to.eventually.be.rejected()
    })
  })

  describe('discovery', () => {
    let local
    let remote
    let relayLibp2p

    beforeEach(async () => {
      const peerIds = await createPeerId({ number: 3 })

      // Create 2 nodes, and turn HOP on for the relay
      ;[local, remote, relayLibp2p] = peerIds.map((peerId, index) => {
        const delegate = new DelegatedContentRouter(peerId, ipfsHttpClient.create({
          host: '0.0.0.0',
          protocol: 'http',
          port: 60197
        }), [
          new Multiaddr('/ip4/0.0.0.0/tcp/60197')
        ])

        const opts = {
          ...baseOptions,
          config: {
            ...baseOptions.config,
            relay: {
              advertise: {
                bootDelay: 1000,
                ttl: 1000,
                enabled: true
              },
              hop: {
                enabled: index === 2
              },
              autoRelay: {
                enabled: true,
                maxListeners: 1
              }
            }
          }
        }

        return new Libp2p({
          ...opts,
          modules: {
            ...opts.modules,
            contentRouting: [delegate]
          },
          addresses: {
            listen: [listenAddr]
          },
          connectionManager: {
            autoDial: false
          },
          peerDiscovery: {
            autoDial: false
          },
          peerId
        })
      })

      sinon.spy(relayLibp2p.contentRouting, 'provide')
    })

    beforeEach(async () => {
      nock('http://0.0.0.0:60197')
        // mock the refs call
        .post('/api/v0/refs')
        .query(true)
        .reply(200, null, [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])

      // Start each node
      await Promise.all([local, remote, relayLibp2p].map(libp2p => libp2p.start()))

      // Should provide on start
      await pWaitFor(() => relayLibp2p.contentRouting.provide.callCount === 1)

      const provider = relayLibp2p.peerId.toB58String()
      const multiaddrs = relayLibp2p.multiaddrs.map((m) => m.toString())

      // Mock findProviders
      nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/findprovs')
        .query(true)
        .reply(200, `{"Extra":"","ID":"${provider}","Responses":[{"Addrs":${JSON.stringify(multiaddrs)},"ID":"${provider}"}],"Type":4}\n`, [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])
    })

    afterEach(() => {
      // Stop each node
      return Promise.all([local, remote, relayLibp2p].map(libp2p => libp2p.stop()))
    })

    it('should find providers for relay and add it as listen relay', async () => {
      const originalMultiaddrsLength = local.multiaddrs.length

      // Spy add listen relay
      sinon.spy(local.relay._autoRelay, '_addListenRelay')
      // Spy Find Providers
      sinon.spy(local.contentRouting, 'findProviders')

      // Try to listen on Available hop relays
      await local.relay._autoRelay._listenOnAvailableHopRelays()

      // Should try to find relay service providers
      await pWaitFor(() => local.contentRouting.findProviders.callCount === 1)
      // Wait for peer added as listen relay
      await pWaitFor(() => local.relay._autoRelay._addListenRelay.callCount === 1)
      expect(local.relay._autoRelay._listenRelays.size).to.equal(1)
      await pWaitFor(() => local.multiaddrs.length === originalMultiaddrsLength + 1)

      const relayedAddr = local.multiaddrs[local.multiaddrs.length - 1]
      await remote.peerStore.addressBook.set(local.peerId, [relayedAddr])

      // Dial from remote through the relayed address
      const conn = await remote.dial(local.peerId)
      expect(conn).to.exist()
    })
  })
})
