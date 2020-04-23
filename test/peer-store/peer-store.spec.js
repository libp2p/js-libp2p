'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')

const PeerStore = require('../../src/peer-store')
const multiaddr = require('multiaddr')
const { MemoryDatastore } = require('interface-datastore')

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
      number: 4
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
      const peer = peerStore.get(peerIds[0])
      expect(peer).to.not.exist()
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
})

describe('libp2p.peerStore', () => {
  let libp2p
  let memoryDatastore

  beforeEach(async () => {
    memoryDatastore = new MemoryDatastore()
    ;[libp2p] = await peerUtils.createPeer({
      started: false,
      config: {
        datastore: memoryDatastore,
        peerStore: {
          persistance: true
        }
      }
    })
  })

  it('should try to load content from an empty datastore', async () => {
    const spyPeerStore = sinon.spy(libp2p.peerStore, 'load')
    const spyDs = sinon.spy(memoryDatastore, 'query')

    await libp2p.start()
    expect(spyPeerStore).to.have.property('callCount', 1)
    // Should be called for AddressBook and ProtoBook
    expect(spyDs).to.have.property('callCount', 2)
    // No data to populate
    expect(libp2p.peerStore.peers.size).to.eq(0)
  })

  it('should store peerStore content on datastore', async () => {
    const [peer] = await peerUtils.createPeerId({ number: 2 })
    const multiaddrs = [multiaddr('/ip4/156.10.1.22/tcp/1000')]
    const protocols = ['/ping/1.0.0']
    const spyDs = sinon.spy(memoryDatastore, 'put')

    await libp2p.start()

    // AddressBook
    await libp2p.peerStore.addressBook.set(peer, multiaddrs)

    expect(spyDs).to.have.property('callCount', 1)

    // ProtoBook
    await libp2p.peerStore.protoBook.set(peer, protocols)

    expect(spyDs).to.have.property('callCount', 2)

    // Should have two peer records stored in the datastore
    const queryParams = {
      prefix: '/peers/'
    }
    let count = 0
    for await (const _ of memoryDatastore.query(queryParams)) { // eslint-disable-line
      count++
    }
    expect(count).to.equal(2)
  })

  it('should load content to the peerStore when restart but not put in datastore again', async () => {
    const spyDs = sinon.spy(memoryDatastore, 'put')
    const peers = await peerUtils.createPeerId({ number: 2 })
    const multiaddrs = [
      multiaddr('/ip4/156.10.1.22/tcp/1000'),
      multiaddr('/ip4/156.10.1.23/tcp/1000')
    ]
    const protocols = ['/ping/1.0.0']

    await libp2p.start()

    // AddressBook
    await libp2p.peerStore.addressBook.set(peers[0], [multiaddrs[0]])
    await libp2p.peerStore.addressBook.set(peers[1], [multiaddrs[1]])

    // ProtoBook
    await libp2p.peerStore.protoBook.set(peers[0], protocols)
    await libp2p.peerStore.protoBook.set(peers[1], protocols)

    expect(spyDs).to.have.property('callCount', 4)
    expect(libp2p.peerStore.peers.size).to.equal(2)

    await libp2p.stop()

    // Load on restart
    const spyAb = sinon.spy(libp2p.peerStore.addressBook, '_loadData')
    const spyPb = sinon.spy(libp2p.peerStore.protoBook, '_loadData')

    await libp2p.start()

    expect(spyAb).to.have.property('callCount', 1)
    expect(spyPb).to.have.property('callCount', 1)
    expect(spyDs).to.have.property('callCount', 4)
    expect(libp2p.peerStore.peers.size).to.equal(2)
  })

  it('should load content to the peerStore when a new node is started with the same datastore', async () => {
    const peers = await peerUtils.createPeerId({ number: 2 })
    const multiaddrs = [
      multiaddr('/ip4/156.10.1.22/tcp/1000'),
      multiaddr('/ip4/156.10.1.23/tcp/1000')
    ]
    const protocols = ['/ping/1.0.0']

    await libp2p.start()

    // AddressBook
    await libp2p.peerStore.addressBook.set(peers[0], [multiaddrs[0]])
    await libp2p.peerStore.addressBook.set(peers[1], [multiaddrs[1]])

    // ProtoBook
    await libp2p.peerStore.protoBook.set(peers[0], protocols)
    await libp2p.peerStore.protoBook.set(peers[1], protocols)

    expect(libp2p.peerStore.peers.size).to.equal(2)

    await libp2p.stop()

    // Use a new node with the previously populated datastore
    const [newNode] = await peerUtils.createPeer({
      started: false,
      config: {
        datastore: memoryDatastore,
        peerStore: {
          persistance: true
        }
      }
    })

    expect(newNode.peerStore.peers.size).to.equal(0)

    const spyAb = sinon.spy(newNode.peerStore.addressBook, '_loadData')
    const spyPb = sinon.spy(newNode.peerStore.protoBook, '_loadData')

    await newNode.start()

    expect(spyAb).to.have.property('callCount', 1)
    expect(spyPb).to.have.property('callCount', 1)

    expect(newNode.peerStore.peers.size).to.equal(2)

    // Validate data
    const peer0 = newNode.peerStore.get(peers[0])
    expect(peer0.id.toB58String()).to.eql(peers[0].toB58String())
    expect(peer0.protocols).to.have.members(protocols)
    expect(peer0.addresses.map((a) => a.multiaddr.toString())).to.have.members([multiaddrs[0].toString()])

    const peer1 = newNode.peerStore.get(peers[1])
    expect(peer1.id.toB58String()).to.eql(peers[1].toB58String())
    expect(peer1.protocols).to.have.members(protocols)
    expect(peer1.addresses.map((a) => a.multiaddr.toString())).to.have.members([multiaddrs[1].toString()])

    await newNode.stop()
  })
})
