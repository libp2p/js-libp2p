'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')

const Envelope = require('../../src/record/envelope')
const PeerRecord = require('../../src/record/peer-record')
const PeerStore = require('../../src/peer-store/persistent')

const multiaddr = require('multiaddr')
const { MemoryDatastore } = require('interface-datastore')
const uint8ArrayFromString = require('uint8arrays/from-string')

const peerUtils = require('../utils/creators/peer')

describe('Persisted PeerStore', () => {
  let datastore, peerStore
  let peerId

  before(async () => {
    [peerId] = await peerUtils.createPeerId({ fixture: false })
  })

  describe('start and stop flows', () => {
    beforeEach(() => {
      datastore = new MemoryDatastore()
      peerStore = new PeerStore({ datastore, peerId })
    })

    afterEach(() => peerStore.stop())

    it('should try to load content from an empty datastore on start', async () => {
      const spyQuery = sinon.spy(datastore, 'query')
      const spyProcessEntry = sinon.spy(peerStore, '_processDatastoreEntry')

      await peerStore.start()
      expect(spyQuery).to.have.property('callCount', 1)
      expect(spyProcessEntry).to.have.property('callCount', 0)

      // No data to populate
      expect(peerStore.peers.size).to.eq(0)
    })

    it('should try to commit data on stop but should not add to batch if not exists', async () => {
      const spyDs = sinon.spy(peerStore, '_commitData')
      const spyBatch = sinon.spy(datastore, 'batch')

      await peerStore.start()
      expect(spyDs).to.have.property('callCount', 0)

      await peerStore.stop()
      expect(spyBatch).to.have.property('callCount', 0)
      expect(spyDs).to.have.property('callCount', 1)
    })
  })

  describe('simple setup with content stored per change (threshold 1)', () => {
    beforeEach(() => {
      datastore = new MemoryDatastore()
      peerStore = new PeerStore({ datastore, peerId, threshold: 1 })
    })

    afterEach(() => peerStore.stop())

    it('should store peerStore content on datastore after peer marked as dirty (threshold 1)', async () => {
      const [peer] = await peerUtils.createPeerId({ number: 2 })
      const multiaddrs = [multiaddr('/ip4/156.10.1.22/tcp/1000')]
      const protocols = ['/ping/1.0.0']
      const spyDirty = sinon.spy(peerStore, '_addDirtyPeer')
      const spyDs = sinon.spy(datastore, 'batch')
      const commitSpy = sinon.spy(peerStore, '_commitData')

      await peerStore.start()

      // AddressBook
      peerStore.addressBook.set(peer, multiaddrs)

      expect(spyDirty).to.have.property('callCount', 1) // Address
      expect(spyDs).to.have.property('callCount', 1)

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      // ProtoBook
      peerStore.protoBook.set(peer, protocols)

      expect(spyDirty).to.have.property('callCount', 2) // Protocol
      expect(spyDs).to.have.property('callCount', 2)

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      // Should have three peer records stored in the datastore
      const queryParams = {
        prefix: '/peers/'
      }

      let count = 0
      for await (const _ of datastore.query(queryParams)) { // eslint-disable-line
        count++
      }
      expect(count).to.equal(2)

      // Validate data
      const storedPeer = peerStore.get(peer)
      expect(storedPeer.id.toB58String()).to.eql(peer.toB58String())
      expect(storedPeer.protocols).to.have.members(protocols)
      expect(storedPeer.addresses.map((a) => a.multiaddr.toString())).to.have.members([multiaddrs[0].toString()])
      expect(storedPeer.addresses.map((a) => a.isCertified)).to.have.members([false])
    })

    it('should load content to the peerStore when restart but not put in datastore again', async () => {
      const spyDs = sinon.spy(datastore, 'batch')
      const peers = await peerUtils.createPeerId({ number: 2 })
      const commitSpy = sinon.spy(peerStore, '_commitData')
      const multiaddrs = [
        multiaddr('/ip4/156.10.1.22/tcp/1000'),
        multiaddr('/ip4/156.10.1.23/tcp/1000')
      ]
      const protocols = ['/ping/1.0.0']

      await peerStore.start()

      // AddressBook
      peerStore.addressBook.set(peers[0], [multiaddrs[0]])
      peerStore.addressBook.set(peers[1], [multiaddrs[1]])

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      // KeyBook
      peerStore.keyBook.set(peers[0], peers[0].pubKey)
      peerStore.keyBook.set(peers[1], peers[1].pubKey)

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      // ProtoBook
      peerStore.protoBook.set(peers[0], protocols)
      peerStore.protoBook.set(peers[1], protocols)

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      // MetadataBook
      peerStore.metadataBook.set(peers[0], 'location', uint8ArrayFromString('earth'))

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      expect(spyDs).to.have.property('callCount', 7) // 2 Address + 2 Key + 2 Proto + 1 Metadata
      expect(peerStore.peers.size).to.equal(2)

      await peerStore.stop()
      peerStore.keyBook.data.clear()
      peerStore.addressBook.data.clear()
      peerStore.protoBook.data.clear()

      // Load on restart
      const spy = sinon.spy(peerStore, '_processDatastoreEntry')

      await peerStore.start()

      expect(spy).to.have.property('callCount', 7)
      expect(spyDs).to.have.property('callCount', 7)

      expect(peerStore.peers.size).to.equal(2)
      expect(peerStore.addressBook.data.size).to.equal(2)
      expect(peerStore.keyBook.data.size).to.equal(2)
      expect(peerStore.protoBook.data.size).to.equal(2)
      expect(peerStore.metadataBook.data.size).to.equal(1)
    })

    it('should delete content from the datastore on delete', async () => {
      const [peer] = await peerUtils.createPeerId()
      const multiaddrs = [multiaddr('/ip4/156.10.1.22/tcp/1000')]
      const protocols = ['/ping/1.0.0']
      const commitSpy = sinon.spy(peerStore, '_commitData')

      await peerStore.start()

      // AddressBook
      peerStore.addressBook.set(peer, multiaddrs)
      // ProtoBook
      peerStore.protoBook.set(peer, protocols)
      // MetadataBook
      peerStore.metadataBook.set(peer, 'location', uint8ArrayFromString('earth'))

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      const spyDs = sinon.spy(datastore, 'batch')
      const spyAddressBook = sinon.spy(peerStore.addressBook, 'delete')
      const spyKeyBook = sinon.spy(peerStore.keyBook, 'delete')
      const spyProtoBook = sinon.spy(peerStore.protoBook, 'delete')
      const spyMetadataBook = sinon.spy(peerStore.metadataBook, 'delete')

      // Delete from PeerStore
      peerStore.delete(peer)

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      await peerStore.stop()

      expect(spyAddressBook).to.have.property('callCount', 1)
      expect(spyKeyBook).to.have.property('callCount', 1)
      expect(spyProtoBook).to.have.property('callCount', 1)
      expect(spyMetadataBook).to.have.property('callCount', 1)
      expect(spyDs).to.have.property('callCount', 3)

      // Should have zero peer records stored in the datastore
      const queryParams = {
        prefix: '/peers/'
      }

      for await (const _ of datastore.query(queryParams)) { // eslint-disable-line
        throw new Error('Datastore should be empty')
      }
    })

    it('should store certified peer records after peer marked as dirty (threshold 1)', async () => {
      const [peerId] = await peerUtils.createPeerId()
      const multiaddrs = [multiaddr('/ip4/156.10.1.22/tcp/1000')]
      const spyDirty = sinon.spy(peerStore, '_addDirtyPeer')
      const spyDs = sinon.spy(datastore, 'batch')
      const commitSpy = sinon.spy(peerStore, '_commitData')

      await peerStore.start()

      const peerRecord = new PeerRecord({
        peerId,
        multiaddrs
      })
      const envelope = await Envelope.seal(peerRecord, peerId)

      // consume peer record
      const consumed = peerStore.addressBook.consumePeerRecord(envelope)
      expect(consumed).to.eql(true)
      expect(spyDirty).to.have.property('callCount', 1) // Address
      expect(spyDs).to.have.property('callCount', 1)

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      // Should have three peer records stored in the datastore
      const queryParams = {
        prefix: '/peers/'
      }

      let count = 0
      for await (const _ of datastore.query(queryParams)) { // eslint-disable-line
        count++
      }
      expect(count).to.equal(1)

      // Validate data
      const storedPeer = peerStore.get(peerId)
      expect(storedPeer.id.toB58String()).to.eql(peerId.toB58String())
      expect(storedPeer.addresses.map((a) => a.multiaddr.toString())).to.have.members([multiaddrs[0].toString()])
      expect(storedPeer.addresses.map((a) => a.isCertified)).to.have.members([true])
    })

    it('should load certified peer records to the peerStore when restart but not put in datastore again', async () => {
      const spyDs = sinon.spy(datastore, 'batch')
      const peers = await peerUtils.createPeerId({ number: 2 })
      const commitSpy = sinon.spy(peerStore, '_commitData')
      const multiaddrs = [
        multiaddr('/ip4/156.10.1.22/tcp/1000'),
        multiaddr('/ip4/156.10.1.23/tcp/1000')
      ]
      const peerRecord0 = new PeerRecord({
        peerId: peers[0],
        multiaddrs: [multiaddrs[0]]
      })
      const envelope0 = await Envelope.seal(peerRecord0, peers[0])
      const peerRecord1 = new PeerRecord({
        peerId: peers[1],
        multiaddrs: [multiaddrs[1]]
      })
      const envelope1 = await Envelope.seal(peerRecord1, peers[1])

      await peerStore.start()

      // AddressBook
      let consumed = peerStore.addressBook.consumePeerRecord(envelope0)
      expect(consumed).to.eql(true)
      consumed = peerStore.addressBook.consumePeerRecord(envelope1)
      expect(consumed).to.eql(true)

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      expect(spyDs).to.have.property('callCount', 2) // 2 Address + 2 Key + 2 Proto + 1 Metadata
      expect(peerStore.peers.size).to.equal(2)

      await peerStore.stop()
      peerStore.addressBook.data.clear()

      // Load on restart
      const spy = sinon.spy(peerStore, '_processDatastoreEntry')

      await peerStore.start()

      expect(spy).to.have.property('callCount', 2)
      expect(spyDs).to.have.property('callCount', 2)

      expect(peerStore.peers.size).to.equal(2)
      expect(peerStore.addressBook.data.size).to.equal(2)

      expect(peerStore.addressBook.getRawEnvelope(peers[0])).to.exist()
      expect(peerStore.addressBook.getRawEnvelope(peers[1])).to.exist()

      // Validate stored envelopes
      const storedEnvelope0 = await peerStore.addressBook.getPeerRecord(peers[0])
      expect(envelope0.equals(storedEnvelope0)).to.eql(true)

      const storedEnvelope1 = await peerStore.addressBook.getPeerRecord(peers[1])
      expect(envelope1.equals(storedEnvelope1)).to.eql(true)

      // Validate multiaddrs
      const storedPeer0 = peerStore.get(peers[0])
      expect(storedPeer0.id.toB58String()).to.eql(peers[0].toB58String())
      expect(storedPeer0.addresses.map((a) => a.multiaddr.toString())).to.have.members([multiaddrs[0].toString()])
      expect(storedPeer0.addresses.map((a) => a.isCertified)).to.have.members([true])

      const storedPeer1 = peerStore.get(peers[1])
      expect(storedPeer1.id.toB58String()).to.eql(peers[1].toB58String())
      expect(storedPeer1.addresses.map((a) => a.multiaddr.toString())).to.have.members([multiaddrs[1].toString()])
      expect(storedPeer1.addresses.map((a) => a.isCertified)).to.have.members([true])
    })

    it('should delete certified peer records from the datastore on delete', async () => {
      const [peer] = await peerUtils.createPeerId()
      const multiaddrs = [multiaddr('/ip4/156.10.1.22/tcp/1000')]
      const commitSpy = sinon.spy(peerStore, '_commitData')

      await peerStore.start()

      // AddressBook
      const peerRecord = new PeerRecord({
        peerId: peer,
        multiaddrs
      })
      const envelope = await Envelope.seal(peerRecord, peer)

      // consume peer record
      const consumed = peerStore.addressBook.consumePeerRecord(envelope)
      expect(consumed).to.eql(true)

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)
      expect(peerStore.addressBook.getRawEnvelope(peer)).to.exist()

      const spyDs = sinon.spy(datastore, 'batch')
      const spyAddressBook = sinon.spy(peerStore.addressBook, 'delete')

      // Delete from PeerStore
      peerStore.delete(peer)

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      await peerStore.stop()

      expect(spyAddressBook).to.have.property('callCount', 1)
      expect(spyDs).to.have.property('callCount', 1)

      // Should have zero peer records stored in the datastore
      const queryParams = {
        prefix: '/peers/'
      }

      for await (const _ of datastore.query(queryParams)) { // eslint-disable-line
        throw new Error('Datastore should be empty')
      }

      expect(peerStore.addressBook.getRawEnvelope(peer)).to.not.exist()
    })
  })

  describe('setup with content not stored per change (threshold 2)', () => {
    beforeEach(() => {
      datastore = new MemoryDatastore()
      peerStore = new PeerStore({ datastore, peerId, threshold: 2 })
    })

    afterEach(() => peerStore.stop())

    it('should not commit until threshold is reached', async () => {
      const spyDirty = sinon.spy(peerStore, '_addDirtyPeer')
      const spyDirtyMetadata = sinon.spy(peerStore, '_addDirtyPeerMetadata')
      const spyDs = sinon.spy(datastore, 'batch')
      const commitSpy = sinon.spy(peerStore, '_commitData')

      const peers = await peerUtils.createPeerId({ number: 2 })

      const multiaddrs = [multiaddr('/ip4/156.10.1.22/tcp/1000')]
      const protocols = ['/ping/1.0.0']

      await peerStore.start()

      expect(spyDirty).to.have.property('callCount', 0)
      expect(spyDs).to.have.property('callCount', 0)

      // Add Peer0 data in multiple books
      peerStore.addressBook.set(peers[0], multiaddrs)
      peerStore.protoBook.set(peers[0], protocols)
      peerStore.metadataBook.set(peers[0], 'location', uint8ArrayFromString('earth'))

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      // Remove data from the same Peer
      peerStore.addressBook.delete(peers[0])

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      expect(spyDirty).to.have.property('callCount', 3) // 2 AddrBook ops, 1 ProtoBook op
      expect(spyDirtyMetadata).to.have.property('callCount', 1) // 1 MetadataBook op
      expect(peerStore._dirtyPeers.size).to.equal(1)
      expect(spyDs).to.have.property('callCount', 0)

      const queryParams = {
        prefix: '/peers/'
      }
      for await (const _ of datastore.query(queryParams)) { // eslint-disable-line
        throw new Error('Datastore should be empty')
      }

      // Add data for second book
      peerStore.addressBook.set(peers[1], multiaddrs)

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      expect(spyDirty).to.have.property('callCount', 4)
      expect(spyDirtyMetadata).to.have.property('callCount', 1)
      expect(spyDs).to.have.property('callCount', 1)

      // Should have three peer records stored in the datastore
      let count = 0
      for await (const _ of datastore.query(queryParams)) { // eslint-disable-line
        count++
      }
      expect(count).to.equal(3)
      expect(peerStore.peers.size).to.equal(2)
    })

    it('should commit on stop if threshold was not reached', async () => {
      const spyDirty = sinon.spy(peerStore, '_addDirtyPeer')
      const spyDs = sinon.spy(datastore, 'batch')

      const protocols = ['/ping/1.0.0']
      const [peer] = await peerUtils.createPeerId()

      await peerStore.start()

      // Add Peer data in a book
      peerStore.protoBook.set(peer, protocols)

      expect(spyDs).to.have.property('callCount', 0)
      expect(spyDirty).to.have.property('callCount', 1) // ProtoBook
      expect(peerStore._dirtyPeers.size).to.equal(1)

      const queryParams = {
        prefix: '/peers/'
      }
      for await (const _ of datastore.query(queryParams)) { // eslint-disable-line
        throw new Error('Datastore should be empty')
      }

      await peerStore.stop()

      expect(spyDirty).to.have.property('callCount', 1)
      expect(spyDs).to.have.property('callCount', 1)
      expect(peerStore._dirtyPeers.size).to.equal(0) // Reset

      // Should have one peer record stored in the datastore
      let count = 0
      for await (const _ of datastore.query(queryParams)) { // eslint-disable-line
        count++
      }
      expect(count).to.equal(1)
      expect(peerStore.peers.size).to.equal(1)
    })
  })
})

describe('libp2p.peerStore (Persisted)', () => {
  describe('disabled by default', () => {
    let libp2p

    before(async () => {
      [libp2p] = await peerUtils.createPeer({
        started: false
      })
    })

    afterEach(() => libp2p.stop())

    it('should not have have persistence capabilities', async () => {
      await libp2p.start()
      expect(libp2p.peerStore._dirtyPeers).to.not.exist()
      expect(libp2p.peerStore.threshold).to.not.exist()
    })
  })

  describe('enabled', () => {
    let libp2p
    let memoryDatastore

    beforeEach(async () => {
      memoryDatastore = new MemoryDatastore()
      ;[libp2p] = await peerUtils.createPeer({
        started: false,
        config: {
          datastore: memoryDatastore,
          peerStore: {
            persistence: true,
            threshold: 2 // trigger on  second peer changed
          }
        }
      })
    })

    afterEach(() => libp2p.stop())

    it('should start on libp2p start and load content', async () => {
      const spyPeerStore = sinon.spy(libp2p.peerStore, 'start')
      const spyDs = sinon.spy(memoryDatastore, 'query')

      await libp2p.start()
      expect(spyPeerStore).to.have.property('callCount', 1)
      expect(spyDs).to.have.property('callCount', 1)
    })

    it('should load content to the peerStore when a new node is started with the same datastore', async () => {
      const commitSpy = sinon.spy(libp2p.peerStore, '_commitData')
      const peers = await peerUtils.createPeerId({ number: 3 })
      const multiaddrs = [
        multiaddr('/ip4/156.10.1.22/tcp/1000'),
        multiaddr('/ip4/156.10.1.23/tcp/1000')
      ]
      const protocols = ['/ping/1.0.0']

      await libp2p.start()

      // AddressBook
      libp2p.peerStore.addressBook.set(peers[1], [multiaddrs[0]])
      libp2p.peerStore.addressBook.set(peers[2], [multiaddrs[1]])

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      // ProtoBook
      libp2p.peerStore.protoBook.set(peers[1], protocols)
      libp2p.peerStore.protoBook.set(peers[2], protocols)

      // let batch commit complete
      await Promise.all(commitSpy.returnValues)

      expect(libp2p.peerStore.peers.size).to.equal(2)

      await libp2p.stop()

      // Use a new node with the previously populated datastore
      const [newNode] = await peerUtils.createPeer({
        started: false,
        config: {
          datastore: memoryDatastore,
          peerStore: {
            persistence: true
          }
        }
      })

      expect(newNode.peerStore.peers.size).to.equal(0)

      const spy = sinon.spy(newNode.peerStore, '_processDatastoreEntry')

      await newNode.start()

      expect(spy).to.have.property('callCount', 4) // 4 datastore entries

      expect(newNode.peerStore.peers.size).to.equal(2)

      // Validate data
      const peer0 = newNode.peerStore.get(peers[1])
      expect(peer0.id.toB58String()).to.eql(peers[1].toB58String())
      expect(peer0.protocols).to.have.members(protocols)
      expect(peer0.addresses.map((a) => a.multiaddr.toString())).to.have.members([multiaddrs[0].toString()])

      const peer1 = newNode.peerStore.get(peers[2])
      expect(peer1.id.toB58String()).to.eql(peers[2].toB58String())
      expect(peer1.protocols).to.have.members(protocols)
      expect(peer1.addresses.map((a) => a.multiaddr.toString())).to.have.members([multiaddrs[1].toString()])

      await newNode.stop()
    })
  })
})
