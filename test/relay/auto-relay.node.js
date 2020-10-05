'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const delay = require('delay')
const pWaitFor = require('p-wait-for')
const sinon = require('sinon')
const nock = require('nock')

const ipfsHttpClient = require('ipfs-http-client')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')
const multiaddr = require('multiaddr')
const Libp2p = require('../../src')
const { relay: relayMulticodec } = require('../../src/circuit/multicodec')

const { createPeerId } = require('../utils/creators/peer')
const baseOptions = require('../utils/base-options')

const listenAddr = '/ip4/0.0.0.0/tcp/0'

describe('auto-relay', () => {
  describe('basics', () => {
    let libp2p
    let relayLibp2p
    let autoRelay

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

      autoRelay = libp2p.relay._autoRelay

      expect(autoRelay.maxListeners).to.eql(1)
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
      // Spy if a connected peer is being added as listen relay
      sinon.spy(autoRelay, '_addListenRelay')

      const originalMultiaddrsLength = relayLibp2p.multiaddrs.length

      // Discover relay
      libp2p.peerStore.addressBook.add(relayLibp2p.peerId, relayLibp2p.multiaddrs)
      await libp2p.dial(relayLibp2p.peerId)

      // Wait for peer added as listen relay
      await pWaitFor(() => autoRelay._addListenRelay.callCount === 1)
      expect(autoRelay._listenRelays.size).to.equal(1)

      // Wait for listen multiaddr update
      await pWaitFor(() => libp2p.multiaddrs.length === originalMultiaddrsLength + 1)
      expect(libp2p.multiaddrs[originalMultiaddrsLength].getPeerId()).to.eql(relayLibp2p.peerId.toB58String())

      // Peer has relay multicodec
      const knownProtocols = libp2p.peerStore.protoBook.get(relayLibp2p.peerId)
      expect(knownProtocols).to.include(relayMulticodec)
    })
  })

  describe('flows with 1 listener max', () => {
    let libp2p
    let relayLibp2p1
    let relayLibp2p2
    let relayLibp2p3
    let autoRelay1

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

      autoRelay1 = relayLibp2p1.relay._autoRelay

      expect(autoRelay1.maxListeners).to.eql(1)
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
      // Spy if a connected peer is being added as listen relay
      sinon.spy(autoRelay1, '_addListenRelay')

      // Discover relay
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)

      const originalMultiaddrs1Length = relayLibp2p1.multiaddrs.length
      const originalMultiaddrs2Length = relayLibp2p2.multiaddrs.length

      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Wait for peer added as listen relay
      await pWaitFor(() => autoRelay1._addListenRelay.callCount === 1)
      expect(autoRelay1._listenRelays.size).to.equal(1)

      // Wait for listen multiaddr update
      await Promise.all([
        pWaitFor(() => relayLibp2p1.multiaddrs.length === originalMultiaddrs1Length + 1),
        pWaitFor(() => relayLibp2p2.multiaddrs.length === originalMultiaddrs2Length + 1)
      ])
      expect(relayLibp2p1.multiaddrs[originalMultiaddrs1Length].getPeerId()).to.eql(relayLibp2p2.peerId.toB58String())

      // Peer has relay multicodec
      const knownProtocols = relayLibp2p1.peerStore.protoBook.get(relayLibp2p2.peerId)
      expect(knownProtocols).to.include(relayMulticodec)
    })

    it('should be able to dial a peer from its relayed address previously added', async () => {
      const originalMultiaddrs1Length = relayLibp2p1.multiaddrs.length
      const originalMultiaddrs2Length = relayLibp2p2.multiaddrs.length

      // Discover relay
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)

      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Wait for listen multiaddr update
      await Promise.all([
        pWaitFor(() => relayLibp2p1.multiaddrs.length === originalMultiaddrs1Length + 1),
        pWaitFor(() => relayLibp2p2.multiaddrs.length === originalMultiaddrs2Length + 1)
      ])
      expect(relayLibp2p1.multiaddrs[originalMultiaddrs1Length].getPeerId()).to.eql(relayLibp2p2.peerId.toB58String())

      // Dial from the other through a relay
      const relayedMultiaddr2 = multiaddr(`${relayLibp2p1.multiaddrs[0]}/p2p/${relayLibp2p1.peerId.toB58String()}/p2p-circuit`)
      libp2p.peerStore.addressBook.add(relayLibp2p2.peerId, [relayedMultiaddr2])

      await libp2p.dial(relayLibp2p2.peerId)
    })

    it('should only add maxListeners relayed addresses', async () => {
      const originalMultiaddrs1Length = relayLibp2p1.multiaddrs.length
      const originalMultiaddrs2Length = relayLibp2p2.multiaddrs.length

      // Spy if a connected peer is being added as listen relay
      sinon.spy(autoRelay1, '_addListenRelay')
      sinon.spy(autoRelay1._listenRelays, 'add')

      // Discover one relay and connect
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      expect(relayLibp2p1.connectionManager.size).to.eql(1)

      // Wait for peer added as listen relay
      await pWaitFor(() => autoRelay1._addListenRelay.callCount === 1 && autoRelay1._listenRelays.add.callCount === 1)
      expect(autoRelay1._listenRelays.size).to.equal(1)

      // Wait for listen multiaddr update
      await Promise.all([
        pWaitFor(() => relayLibp2p1.multiaddrs.length === originalMultiaddrs1Length + 1),
        pWaitFor(() => relayLibp2p2.multiaddrs.length === originalMultiaddrs2Length + 1)
      ])
      expect(relayLibp2p1.multiaddrs[originalMultiaddrs1Length].getPeerId()).to.eql(relayLibp2p2.peerId.toB58String())

      // Relay2 has relay multicodec
      const knownProtocols2 = relayLibp2p1.peerStore.protoBook.get(relayLibp2p2.peerId)
      expect(knownProtocols2).to.include(relayMulticodec)

      // Discover an extra relay and connect
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p3.peerId)

      // Wait to guarantee the dialed peer is not added as a listen relay
      await delay(300)

      expect(autoRelay1._addListenRelay.callCount).to.equal(2)
      expect(autoRelay1._listenRelays.add.callCount).to.equal(1)
      expect(autoRelay1._listenRelays.size).to.equal(1)
      expect(relayLibp2p1.connectionManager.size).to.eql(2)

      // Relay2 has relay multicodec
      const knownProtocols3 = relayLibp2p1.peerStore.protoBook.get(relayLibp2p3.peerId)
      expect(knownProtocols3).to.include(relayMulticodec)
    })

    it('should not listen on a relayed address if peer disconnects', async () => {
      const originalMultiaddrs1Length = relayLibp2p1.multiaddrs.length

      // Spy if identify push is fired on adding/removing listen addr
      sinon.spy(relayLibp2p1.identifyService, 'pushToPeerStore')

      // Discover one relay and connect
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Wait for listenning on the relay
      await pWaitFor(() => relayLibp2p1.multiaddrs.length === originalMultiaddrs1Length + 1)
      expect(autoRelay1._listenRelays.size).to.equal(1)
      expect(relayLibp2p1.multiaddrs[originalMultiaddrs1Length].getPeerId()).to.eql(relayLibp2p2.peerId.toB58String())

      // Identify push for adding listen relay multiaddr
      expect(relayLibp2p1.identifyService.pushToPeerStore.callCount).to.equal(1)

      // Disconnect from peer used for relay
      await relayLibp2p1.hangUp(relayLibp2p2.peerId)

      // Wait for removed listening on the relay
      await pWaitFor(() => relayLibp2p1.multiaddrs.length === originalMultiaddrs1Length)
      expect(autoRelay1._listenRelays.size).to.equal(0)

      // Identify push for removing listen relay multiaddr
      expect(relayLibp2p1.identifyService.pushToPeerStore.callCount).to.equal(2)
    })

    it('should try to listen on other connected peers relayed address if one used relay disconnects', async () => {
      const originalMultiaddrs1Length = relayLibp2p1.multiaddrs.length

      // Spy if a connected peer is being added as listen relay
      sinon.spy(autoRelay1, '_addListenRelay')
      sinon.spy(relayLibp2p1.transportManager, 'listen')

      // Discover one relay and connect
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Discover an extra relay and connect
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p3.peerId)

      // Wait for both peer to be attempted to added as listen relay
      await pWaitFor(() => autoRelay1._addListenRelay.callCount === 1)
      expect(autoRelay1._listenRelays.size).to.equal(1)
      expect(relayLibp2p1.connectionManager.size).to.equal(2)

      // Wait for listen multiaddr update
      await pWaitFor(() => relayLibp2p1.multiaddrs.length === originalMultiaddrs1Length + 1)
      expect(relayLibp2p1.multiaddrs[originalMultiaddrs1Length].getPeerId()).to.eql(relayLibp2p2.peerId.toB58String())

      // Only one will be used for listeninng
      expect(relayLibp2p1.transportManager.listen.callCount).to.equal(1)

      // Spy if relay from listen map was removed
      sinon.spy(autoRelay1._listenRelays, 'delete')

      // Disconnect from peer used for relay
      await relayLibp2p1.hangUp(relayLibp2p2.peerId)
      expect(autoRelay1._listenRelays.delete.callCount).to.equal(1)
      expect(autoRelay1._addListenRelay.callCount).to.equal(1)

      // Wait for other peer connected to be added as listen addr
      await pWaitFor(() => relayLibp2p1.transportManager.listen.callCount === 2)
      expect(autoRelay1._listenRelays.size).to.equal(1)
      expect(relayLibp2p1.connectionManager.size).to.eql(1)

      // Wait for listen multiaddr update
      await pWaitFor(() => relayLibp2p1.multiaddrs.length === originalMultiaddrs1Length + 1)
      expect(relayLibp2p1.multiaddrs[originalMultiaddrs1Length].getPeerId()).to.eql(relayLibp2p3.peerId.toB58String())
    })

    it('should try to listen on stored peers relayed address if one used relay disconnects and there are not enough connected', async () => {
      // Spy if a connected peer is being added as listen relay
      sinon.spy(autoRelay1, '_addListenRelay')
      sinon.spy(relayLibp2p1.transportManager, 'listen')

      // Discover one relay and connect
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Discover an extra relay and connect to gather its Hop support
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p3.peerId)

      // Wait for both peer to be attempted to added as listen relay
      await pWaitFor(() => autoRelay1._addListenRelay.callCount === 2)
      expect(autoRelay1._listenRelays.size).to.equal(1)
      expect(relayLibp2p1.connectionManager.size).to.equal(2)

      // Only one will be used for listeninng
      expect(relayLibp2p1.transportManager.listen.callCount).to.equal(1)

      // Disconnect not used listen relay
      await relayLibp2p1.hangUp(relayLibp2p3.peerId)

      expect(autoRelay1._listenRelays.size).to.equal(1)
      expect(relayLibp2p1.connectionManager.size).to.equal(1)

      // Spy on dial
      sinon.spy(relayLibp2p1, 'dial')

      // Remove peer used as relay from peerStore and disconnect it
      relayLibp2p1.peerStore.delete(relayLibp2p2.peerId)
      await relayLibp2p1.hangUp(relayLibp2p2.peerId)
      expect(autoRelay1._listenRelays.size).to.equal(0)
      expect(relayLibp2p1.connectionManager.size).to.equal(0)

      // Wait for other peer connected to be added as listen addr
      await pWaitFor(() => relayLibp2p1.transportManager.listen.callCount === 2)
      expect(autoRelay1._listenRelays.size).to.equal(1)
      expect(relayLibp2p1.connectionManager.size).to.eql(1)
    })
  })

  describe('flows with 2 max listeners', () => {
    let relayLibp2p1
    let relayLibp2p2
    let relayLibp2p3
    let autoRelay1
    let autoRelay2

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

      autoRelay1 = relayLibp2p1.relay._autoRelay
      autoRelay2 = relayLibp2p2.relay._autoRelay
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
      // Spy if a connected peer is being added as listen relay
      sinon.spy(autoRelay1, '_addListenRelay')
      sinon.spy(autoRelay2, '_addListenRelay')

      // Relay 1 discovers Relay 3 and connect
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p3.peerId)

      // Wait for peer added as listen relay
      await pWaitFor(() => autoRelay1._addListenRelay.callCount === 1)
      expect(autoRelay1._listenRelays.size).to.equal(1)

      // Relay 2 discovers Relay 3 and connect
      relayLibp2p2.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.multiaddrs)
      await relayLibp2p2.dial(relayLibp2p3.peerId)

      // Wait for peer added as listen relay
      await pWaitFor(() => autoRelay2._addListenRelay.callCount === 1)
      expect(autoRelay2._listenRelays.size).to.equal(1)

      // Relay 1 discovers Relay 2 relayed multiaddr via Relay 3
      const ma2RelayedBy3 = relayLibp2p2.multiaddrs[relayLibp2p2.multiaddrs.length - 1]
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, [ma2RelayedBy3])
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Peer not added as listen relay
      expect(autoRelay1._addListenRelay.callCount).to.equal(1)
      expect(autoRelay1._listenRelays.size).to.equal(1)
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
        const delegate = new DelegatedContentRouter(peerId, ipfsHttpClient({
          host: '0.0.0.0',
          protocol: 'http',
          port: 60197
        }), [
          multiaddr('/ip4/0.0.0.0/tcp/60197')
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
      remote.peerStore.addressBook.set(local.peerId, [relayedAddr])

      // Dial from remote through the relayed address
      const conn = await remote.dial(local.peerId)
      expect(conn).to.exist()
    })
  })
})
