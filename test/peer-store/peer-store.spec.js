'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const all = require('it-all')
const PeerStore = require('../../src/peer-store')
const { Multiaddr } = require('multiaddr')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { MemoryDatastore } = require('datastore-core/memory')
const peerUtils = require('../utils/creators/peer')
const { mockConnectionGater } = require('../utils/mock-connection-gater')

const addr1 = new Multiaddr('/ip4/127.0.0.1/tcp/8000')
const addr2 = new Multiaddr('/ip4/127.0.0.1/tcp/8001')
const addr3 = new Multiaddr('/ip4/127.0.0.1/tcp/8002')
const addr4 = new Multiaddr('/ip4/127.0.0.1/tcp/8003')

const proto1 = '/protocol1'
const proto2 = '/protocol2'
const proto3 = '/protocol3'

/**
 * @typedef {import('../../src/peer-store/types').PeerStore} PeerStore
 */

describe('peer-store', () => {
  const connectionGater = mockConnectionGater()
  let peerIds
  before(async () => {
    peerIds = await peerUtils.createPeerId({
      number: 5
    })
  })

  describe('empty books', () => {
    /** @type {PeerStore} */
    let peerStore

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId: peerIds[4],
        datastore: new MemoryDatastore(),
        addressFilter: connectionGater.filterMultiaddrForPeer
      })
    })

    it('has an empty map of peers', async () => {
      const peers = await all(peerStore.getPeers())
      expect(peers.length).to.equal(0)
    })

    it('deletes a peerId', async () => {
      await peerStore.addressBook.set(peerIds[0], [new Multiaddr('/ip4/127.0.0.1/tcp/4001')])
      await expect(peerStore.has(peerIds[0])).to.eventually.be.true()
      await peerStore.delete(peerIds[0])
      await expect(peerStore.has(peerIds[0])).to.eventually.be.false()
    })

    it('sets the peer\'s public key to the KeyBook', async () => {
      await peerStore.keyBook.set(peerIds[0], peerIds[0].pubKey)
      await expect(peerStore.keyBook.get(peerIds[0])).to.eventually.deep.equal(peerIds[0].pubKey)
    })
  })

  describe('previously populated books', () => {
    /** @type {PeerStore} */
    let peerStore

    beforeEach(async () => {
      peerStore = new PeerStore({
        peerId: peerIds[4],
        datastore: new MemoryDatastore(),
        addressFilter: connectionGater.filterMultiaddrForPeer
      })

      // Add peer0 with { addr1, addr2 } and { proto1 }
      await peerStore.addressBook.set(peerIds[0], [addr1, addr2])
      await peerStore.protoBook.set(peerIds[0], [proto1])

      // Add peer1 with { addr3 } and { proto2, proto3 }
      await peerStore.addressBook.set(peerIds[1], [addr3])
      await peerStore.protoBook.set(peerIds[1], [proto2, proto3])

      // Add peer2 with { addr4 }
      await peerStore.addressBook.set(peerIds[2], [addr4])

      // Add peer3 with { addr4 } and { proto2 }
      await peerStore.addressBook.set(peerIds[3], [addr4])
      await peerStore.protoBook.set(peerIds[3], [proto2])
    })

    it('has peers', async () => {
      const peers = await all(peerStore.getPeers())

      expect(peers.length).to.equal(4)
      expect(peers.map(peer => peer.id.toB58String())).to.have.members([
        peerIds[0].toB58String(),
        peerIds[1].toB58String(),
        peerIds[2].toB58String(),
        peerIds[3].toB58String()
      ])
    })

    it('deletes a stored peer', async () => {
      await peerStore.delete(peerIds[0])

      const peers = await all(peerStore.getPeers())
      expect(peers.length).to.equal(3)
      expect(Array.from(peers.keys())).to.not.have.members([peerIds[0].toB58String()])
    })

    it('deletes a stored peer which is only on one book', async () => {
      await peerStore.delete(peerIds[2])

      const peers = await all(peerStore.getPeers())
      expect(peers.length).to.equal(3)
    })

    it('gets the stored information of a peer in all its books', async () => {
      const peer = await peerStore.get(peerIds[0])
      expect(peer).to.exist()
      expect(peer.protocols).to.have.members([proto1])

      const peerMultiaddrs = peer.addresses.map((mi) => mi.multiaddr)
      expect(peerMultiaddrs).to.have.deep.members([addr1, addr2])

      expect(peer.id.toB58String()).to.equal(peerIds[0].toB58String())
    })

    it('gets the stored information of a peer that is not present in all its books', async () => {
      const peers = await peerStore.get(peerIds[2])
      expect(peers).to.exist()
      expect(peers.protocols.length).to.eql(0)

      const peerMultiaddrs = peers.addresses.map((mi) => mi.multiaddr)
      expect(peerMultiaddrs).to.have.deep.members([addr4])
    })

    it('can find all the peers supporting a protocol', async () => {
      const peerSupporting2 = []

      for await (const peer of peerStore.getPeers()) {
        if (peer.protocols.includes(proto2)) {
          peerSupporting2.push(peer)
        }
      }

      expect(peerSupporting2.length).to.eql(2)
      expect(peerSupporting2[0].id.toB58String()).to.eql(peerIds[1].toB58String())
      expect(peerSupporting2[1].id.toB58String()).to.eql(peerIds[3].toB58String())
    })

    it('can find all the peers listening on a given address', async () => {
      const peerListening4 = []

      for await (const peer of peerStore.getPeers()) {
        const multiaddrs = peer.addresses.map((mi) => mi.multiaddr.toString())

        if (multiaddrs.includes(addr4.toString())) {
          peerListening4.push(peer)
        }
      }

      expect(peerListening4.length).to.eql(2)
      expect(peerListening4[0].id.toB58String()).to.eql(peerIds[2].toB58String())
      expect(peerListening4[1].id.toB58String()).to.eql(peerIds[3].toB58String())
    })
  })

  describe('peerStore.getPeers', () => {
    /** @type {PeerStore} */
    let peerStore

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId: peerIds[4],
        datastore: new MemoryDatastore(),
        addressFilter: connectionGater.filterMultiaddrForPeer
      })
    })

    it('returns peers if only addresses are known', async () => {
      await peerStore.addressBook.set(peerIds[0], [addr1])

      const peers = await all(peerStore.getPeers())
      expect(peers.length).to.equal(1)

      const peerData = peers[0]
      expect(peerData).to.exist()
      expect(peerData.id).to.exist()
      expect(peerData.addresses).to.have.lengthOf(1)
      expect(peerData.protocols).to.have.lengthOf(0)
      expect(peerData.metadata).to.be.empty()
    })

    it('returns peers if only protocols are known', async () => {
      await peerStore.protoBook.set(peerIds[0], [proto1])

      const peers = await all(peerStore.getPeers())
      expect(peers.length).to.equal(1)

      const peerData = peers[0]
      expect(peerData).to.exist()
      expect(peerData.id).to.exist()
      expect(peerData.addresses).to.have.lengthOf(0)
      expect(peerData.protocols).to.have.lengthOf(1)
      expect(peerData.metadata).to.be.empty()
    })

    it('returns peers if only metadata is known', async () => {
      const metadataKey = 'location'
      const metadataValue = uint8ArrayFromString('earth')
      await peerStore.metadataBook.setValue(peerIds[0], metadataKey, metadataValue)

      const peers = await all(peerStore.getPeers())
      expect(peers.length).to.equal(1)

      const peerData = peers[0]
      expect(peerData).to.exist()
      expect(peerData.id).to.exist()
      expect(peerData.addresses).to.have.lengthOf(0)
      expect(peerData.protocols).to.have.lengthOf(0)
      expect(peerData.metadata).to.exist()
      expect(peerData.metadata.get(metadataKey)).to.equalBytes(metadataValue)
    })
  })
})
