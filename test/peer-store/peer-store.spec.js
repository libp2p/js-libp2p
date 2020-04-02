'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const PeerStore = require('../../src/peer-store')
const multiaddr = require('multiaddr')

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
      number: 3
    })
  })

  describe('empty books', () => {
    let peerStore

    beforeEach(() => {
      peerStore = new PeerStore()
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
      const peerInfo = peerStore.find(peerIds[0])
      expect(peerInfo).to.not.exist()
    })
  })

  describe('previously populated books', () => {
    let peerStore

    beforeEach(() => {
      peerStore = new PeerStore()

      // Add peer0 with { addr1, addr2 } and { proto1 }
      peerStore.addressBook.set(peerIds[0], [addr1, addr2])
      peerStore.protoBook.set(peerIds[0], [proto1])

      // Add peer1 with { addr3 } and { proto2, proto3 }
      peerStore.addressBook.set(peerIds[1], [addr3])
      peerStore.protoBook.set(peerIds[1], [proto2, proto3])

      // Add peer2 { addr4 }
      peerStore.addressBook.set(peerIds[2], [addr4])
    })

    it('has peers', () => {
      const peers = peerStore.peers

      expect(peers.size).to.equal(3)
      expect(Array.from(peers.keys())).to.have.members([
        peerIds[0].toB58String(),
        peerIds[1].toB58String(),
        peerIds[2].toB58String()
      ])
    })

    it('returns true on deleting a stored peer', () => {
      const deleted = peerStore.delete(peerIds[0])
      expect(deleted).to.equal(true)

      const peers = peerStore.peers
      expect(peers.size).to.equal(2)
      expect(Array.from(peers.keys())).to.not.have.members([peerIds[0].toString()])
    })

    it('returns true on deleting a stored peer which is only on one book', () => {
      const deleted = peerStore.delete(peerIds[2])
      expect(deleted).to.equal(true)

      const peers = peerStore.peers
      expect(peers.size).to.equal(2)
    })

    it('finds the stored information of a peer in all its books', () => {
      const peerInfo = peerStore.find(peerIds[0])
      expect(peerInfo).to.exist()
      expect(peerInfo.protocols).to.have.members([proto1])

      const peerMultiaddrs = peerInfo.multiaddrInfos.map((mi) => mi.multiaddr)
      expect(peerMultiaddrs).to.have.members([addr1, addr2])
    })

    it('finds the stored information of a peer that is not present in all its books', () => {
      const peerInfo = peerStore.find(peerIds[2])
      expect(peerInfo).to.exist()
      expect(peerInfo.protocols.length).to.eql(0)

      const peerMultiaddrs = peerInfo.multiaddrInfos.map((mi) => mi.multiaddr)
      expect(peerMultiaddrs).to.have.members([addr4])
    })
  })
})
