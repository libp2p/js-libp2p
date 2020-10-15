'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')

const PeerStore = require('../../src/peer-store')
const multiaddr = require('multiaddr')
const uint8ArrayFromString = require('uint8arrays/from-string')

const peerUtils = require('../utils/creators/peer')

const addr1 = multiaddr('/ip4/127.0.0.1/tcp/8000')
const addr2 = multiaddr('/ip4/127.0.0.1/tcp/8001')
const addr3 = multiaddr('/ip4/127.0.0.1/tcp/8002')
const addr4 = multiaddr('/ip4/127.0.0.1/tcp/8003')

const proto1 = '/protocol1'
const proto2 = '/protocol2'
const proto3 = '/protocol3'

describe('peer-store', () => {
  let peerIds
  before(async () => {
    peerIds = await peerUtils.createPeerId({
      number: 5
    })
  })

  describe('empty books', () => {
    let peerStore

    beforeEach(() => {
      peerStore = new PeerStore({ peerId: peerIds[4] })
    })

    it('has an empty map of peers', () => {
      const peers = peerStore.peers
      expect(peers.size).to.equal(0)
    })

    it('returns false on trying to delete a non existant peerId', () => {
      const deleted = peerStore.delete(peerIds[0])
      expect(deleted).to.equal(false)
    })

    it('returns undefined on trying to find a non existant peerId', () => {
      const peer = peerStore.get(peerIds[0])
      expect(peer).to.not.exist()
    })

    it('sets the peer\'s public key to the KeyBook', () => {
      peerStore.keyBook.set(peerIds[0], peerIds[0].pubKey)

      const pubKey = peerStore.keyBook.get(peerIds[0])
      expect(pubKey).to.exist()
    })
  })

  describe('previously populated books', () => {
    let peerStore

    beforeEach(() => {
      peerStore = new PeerStore({ peerId: peerIds[4] })

      // Add peer0 with { addr1, addr2 } and { proto1 }
      peerStore.addressBook.set(peerIds[0], [addr1, addr2])
      peerStore.protoBook.set(peerIds[0], [proto1])

      // Add peer1 with { addr3 } and { proto2, proto3 }
      peerStore.addressBook.set(peerIds[1], [addr3])
      peerStore.protoBook.set(peerIds[1], [proto2, proto3])

      // Add peer2 with { addr4 }
      peerStore.addressBook.set(peerIds[2], [addr4])

      // Add peer3 with { addr4 } and { proto2 }
      peerStore.addressBook.set(peerIds[3], [addr4])
      peerStore.protoBook.set(peerIds[3], [proto2])
    })

    it('has peers', () => {
      const peers = peerStore.peers

      expect(peers.size).to.equal(4)
      expect(Array.from(peers.keys())).to.have.members([
        peerIds[0].toB58String(),
        peerIds[1].toB58String(),
        peerIds[2].toB58String(),
        peerIds[3].toB58String()
      ])
    })

    it('returns true on deleting a stored peer', () => {
      const deleted = peerStore.delete(peerIds[0])
      expect(deleted).to.equal(true)

      const peers = peerStore.peers
      expect(peers.size).to.equal(3)
      expect(Array.from(peers.keys())).to.not.have.members([peerIds[0].toB58String()])
    })

    it('returns true on deleting a stored peer which is only on one book', () => {
      const deleted = peerStore.delete(peerIds[2])
      expect(deleted).to.equal(true)

      const peers = peerStore.peers
      expect(peers.size).to.equal(3)
    })

    it('gets the stored information of a peer in all its books', () => {
      const peer = peerStore.get(peerIds[0])
      expect(peer).to.exist()
      expect(peer.protocols).to.have.members([proto1])

      const peerMultiaddrs = peer.addresses.map((mi) => mi.multiaddr)
      expect(peerMultiaddrs).to.have.members([addr1, addr2])

      expect(peer.id).to.exist()
    })

    it('gets the stored information of a peer that is not present in all its books', () => {
      const peers = peerStore.get(peerIds[2])
      expect(peers).to.exist()
      expect(peers.protocols.length).to.eql(0)

      const peerMultiaddrs = peers.addresses.map((mi) => mi.multiaddr)
      expect(peerMultiaddrs).to.have.members([addr4])
    })

    it('can find all the peers supporting a protocol', () => {
      const peerSupporting2 = []

      for (const [, peer] of peerStore.peers.entries()) {
        if (peer.protocols.includes(proto2)) {
          peerSupporting2.push(peer)
        }
      }

      expect(peerSupporting2.length).to.eql(2)
      expect(peerSupporting2[0].id.toB58String()).to.eql(peerIds[1].toB58String())
      expect(peerSupporting2[1].id.toB58String()).to.eql(peerIds[3].toB58String())
    })

    it('can find all the peers listening on a given address', () => {
      const peerListenint4 = []

      for (const [, peer] of peerStore.peers.entries()) {
        const multiaddrs = peer.addresses.map((mi) => mi.multiaddr)

        if (multiaddrs.includes(addr4)) {
          peerListenint4.push(peer)
        }
      }

      expect(peerListenint4.length).to.eql(2)
      expect(peerListenint4[0].id.toB58String()).to.eql(peerIds[2].toB58String())
      expect(peerListenint4[1].id.toB58String()).to.eql(peerIds[3].toB58String())
    })
  })

  describe('peerStore.peers', () => {
    let peerStore

    beforeEach(() => {
      peerStore = new PeerStore({ peerId: peerIds[4] })
    })

    it('returns peers if only addresses are known', () => {
      peerStore.addressBook.set(peerIds[0], [addr1])

      const peers = peerStore.peers
      expect(peers.size).to.equal(1)

      const peerData = peers.get(peerIds[0].toB58String())
      expect(peerData).to.exist()
      expect(peerData.id).to.exist()
      expect(peerData.addresses).to.have.lengthOf(1)
      expect(peerData.protocols).to.have.lengthOf(0)
      expect(peerData.metadata).to.not.exist()
    })

    it('returns peers if only protocols are known', () => {
      peerStore.protoBook.set(peerIds[0], [proto1])

      const peers = peerStore.peers
      expect(peers.size).to.equal(1)

      const peerData = peers.get(peerIds[0].toB58String())
      expect(peerData).to.exist()
      expect(peerData.id).to.exist()
      expect(peerData.addresses).to.have.lengthOf(0)
      expect(peerData.protocols).to.have.lengthOf(1)
      expect(peerData.metadata).to.not.exist()
    })

    it('returns peers if only metadata is known', () => {
      const metadataKey = 'location'
      const metadataValue = uint8ArrayFromString('earth')
      peerStore.metadataBook.set(peerIds[0], metadataKey, metadataValue)

      const peers = peerStore.peers
      expect(peers.size).to.equal(1)

      const peerData = peers.get(peerIds[0].toB58String())
      expect(peerData).to.exist()
      expect(peerData.id).to.exist()
      expect(peerData.addresses).to.have.lengthOf(0)
      expect(peerData.protocols).to.have.lengthOf(0)
      expect(peerData.metadata).to.exist()
      expect(peerData.metadata.get(metadataKey)).to.equalBytes(metadataValue)
    })
  })
})
