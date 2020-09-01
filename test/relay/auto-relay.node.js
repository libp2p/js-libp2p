'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const delay = require('delay')
const pWaitFor = require('p-wait-for')
const sinon = require('sinon')

const multiaddr = require('multiaddr')
const Libp2p = require('../../src')
const { relay: relayMulticodec } = require('../../src/circuit/multicodec')

const { createPeerId } = require('../utils/creators/peer')
const baseOptions = require('../utils/base-options')

const listenAddr = '/ip4/0.0.0.0/tcp/0'

describe('auto-relay', () => {
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
        const opts = baseOptions

        if (index !== 0) {
          opts.config.relay = {
            ...opts.config.relay,
            hop: {
              enabled: true
            },
            autoRelay: {
              enabled: true,
              maxListeners: 1
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

      autoRelay1 = relayLibp2p1.transportManager._transports.get('Circuit')._autoRelay

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
      expect(relayLibp2p1.multiaddrs).to.have.lengthOf(2)
      expect(relayLibp2p2.multiaddrs).to.have.lengthOf(2)

      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Wait for peer added as listen relay
      await pWaitFor(() => autoRelay1._addListenRelay.callCount === 1)
      expect(autoRelay1._listenRelays.size).to.equal(1)

      // Wait for listen multiaddr update
      await Promise.all([
        pWaitFor(() => relayLibp2p1.multiaddrs.length === 3),
        pWaitFor(() => relayLibp2p2.multiaddrs.length === 3)
      ])
      expect(relayLibp2p1.multiaddrs[2].getPeerId()).to.eql(relayLibp2p2.peerId.toB58String())

      // Peer has relay multicodec
      const knownProtocols = relayLibp2p1.peerStore.protoBook.get(relayLibp2p2.peerId)
      expect(knownProtocols).to.include(relayMulticodec)
    })

    it('should be able to dial a peer from its relayed address previously added', async () => {
      // Discover relay
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)

      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Wait for listen multiaddr update
      await Promise.all([
        pWaitFor(() => relayLibp2p1.multiaddrs.length === 3),
        pWaitFor(() => relayLibp2p2.multiaddrs.length === 3)
      ])
      expect(relayLibp2p1.multiaddrs[2].getPeerId()).to.eql(relayLibp2p2.peerId.toB58String())

      // Dial from the other through a relay
      const relayedMultiaddr2 = multiaddr(`${relayLibp2p1.multiaddrs[0]}/p2p/${relayLibp2p1.peerId.toB58String()}/p2p-circuit`)
      libp2p.peerStore.addressBook.add(relayLibp2p2.peerId, [relayedMultiaddr2])

      await libp2p.dial(relayLibp2p2.peerId)
    })

    it('should only add maxListeners relayed addresses', async () => {
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
        pWaitFor(() => relayLibp2p1.multiaddrs.length === 3),
        pWaitFor(() => relayLibp2p2.multiaddrs.length === 3)
      ])
      expect(relayLibp2p1.multiaddrs[2].getPeerId()).to.eql(relayLibp2p2.peerId.toB58String())

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
      // Discover one relay and connect
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Wait for listenning on the relay
      await pWaitFor(() => relayLibp2p1.multiaddrs.length === 3)
      expect(autoRelay1._listenRelays.size).to.equal(1)
      expect(relayLibp2p1.multiaddrs[2].getPeerId()).to.eql(relayLibp2p2.peerId.toB58String())

      // Disconnect from peer used for relay
      await relayLibp2p1.hangUp(relayLibp2p2.peerId)

      // Wait for removed listening on the relay
      await pWaitFor(() => relayLibp2p1.multiaddrs.length === 2)
      expect(autoRelay1._listenRelays.size).to.equal(0)
    })

    it('should try to listen on other relayed addresses if one used relay disconnects', async () => {
      // Spy if a connected peer is being added as listen relay
      sinon.spy(autoRelay1, '_addListenRelay')

      // Discover one relay and connect
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p2.peerId, relayLibp2p2.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p2.peerId)

      // Discover an extra relay and connect
      relayLibp2p1.peerStore.addressBook.add(relayLibp2p3.peerId, relayLibp2p3.multiaddrs)
      await relayLibp2p1.dial(relayLibp2p3.peerId)

      // Wait for peer added as listen relay
      await pWaitFor(() => autoRelay1._addListenRelay.callCount === 1)
      expect(autoRelay1._listenRelays.size).to.equal(1)
      expect(relayLibp2p1.connectionManager.size).to.eql(2)

      // Wait for listen multiaddr update
      await pWaitFor(() => relayLibp2p1.multiaddrs.length === 3)
      expect(relayLibp2p1.multiaddrs[2].getPeerId()).to.eql(relayLibp2p2.peerId.toB58String())

      // Spy if relay from listen map was removed
      sinon.spy(autoRelay1._listenRelays, 'delete')

      // Disconnect from peer used for relay
      await relayLibp2p1.hangUp(relayLibp2p2.peerId)
      expect(autoRelay1._listenRelays.delete.callCount).to.equal(1)
      expect(autoRelay1._addListenRelay.callCount).to.equal(1)

      // Wait for other peer connected to be added as listen relay
      await pWaitFor(() => autoRelay1._addListenRelay.callCount === 2)
      expect(autoRelay1._listenRelays.size).to.equal(1)
      expect(relayLibp2p1.connectionManager.size).to.eql(1)

      // Wait for listen multiaddr update
      await pWaitFor(() => relayLibp2p1.multiaddrs.length === 3)
      expect(relayLibp2p1.multiaddrs[2].getPeerId()).to.eql(relayLibp2p3.peerId.toB58String())
    })
  })

  // TODO: do not allow listen on a relayed connection
  describe.skip('flows with 2 max listeners', () => {
    let relayLibp2p1
    let relayLibp2p2
    let relayLibp2p3
    let autoRelay1
    let autoRelay2

    beforeEach(async () => {
      const peerIds = await createPeerId({ number: 3 })
      // Create 3 nodes, and turn HOP on for the relay
      ;[relayLibp2p1, relayLibp2p2, relayLibp2p3] = peerIds.map((peerId, index) => {
        const opts = baseOptions

        return new Libp2p({
          ...opts,
          config: {
            ...opts.config,
            relay: {
              ...opts.config.relay,
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

      autoRelay1 = relayLibp2p1.transportManager._transports.get('Circuit')._autoRelay
      autoRelay2 = relayLibp2p2.transportManager._transports.get('Circuit')._autoRelay
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
    })
  })
})
