'use strict'
/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

const { expect } = require('aegir/utils/chai')
const { Buffer } = require('buffer')
const { Multiaddr } = require('multiaddr')
const arrayEquals = require('libp2p-utils/src/array-equals')
const addressSort = require('libp2p-utils/src/address-sort')
const PeerId = require('peer-id')
const pDefer = require('p-defer')
const { MemoryDatastore } = require('datastore-core/memory')
const PeerStore = require('../../src/peer-store')
const Envelope = require('../../src/record/envelope')
const PeerRecord = require('../../src/record/peer-record')

const peerUtils = require('../utils/creators/peer')
const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../../src/errors')

/**
 * @typedef {import('../../src/peer-store/types').PeerStore} PeerStore
 * @typedef {import('../../src/peer-store/types').AddressBook} AddressBook
 */

const addr1 = new Multiaddr('/ip4/127.0.0.1/tcp/8000')
const addr2 = new Multiaddr('/ip4/20.0.0.1/tcp/8001')
const addr3 = new Multiaddr('/ip4/127.0.0.1/tcp/8002')

describe('addressBook', () => {
  let peerId

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
  })

  describe('addressBook.set', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {AddressBook} */
    let ab

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      ab = peerStore.addressBook
    })

    afterEach(() => {
      peerStore.removeAllListeners()
    })

    it('throwns invalid parameters error if invalid PeerId is provided', async () => {
      try {
        await ab.set('invalid peerId')
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('throwns invalid parameters error if no addresses provided', async () => {
      try {
        await ab.set(peerId)
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('no addresses should throw error')
    })

    it('throwns invalid parameters error if invalid multiaddrs are provided', async () => {
      try {
        await ab.set(peerId, ['invalid multiaddr'])
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid multiaddrs should throw error')
    })

    it('replaces the stored content by default and emit change event', async () => {
      const defer = pDefer()
      const supportedMultiaddrs = [addr1, addr2]

      peerStore.once('change:multiaddrs', ({ peerId, multiaddrs }) => {
        expect(peerId).to.exist()
        expect(multiaddrs).to.eql(supportedMultiaddrs)
        defer.resolve()
      })

      await ab.set(peerId, supportedMultiaddrs)
      const addresses = await ab.get(peerId)
      const multiaddrs = addresses.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(supportedMultiaddrs)

      return defer.promise
    })

    it('emits on set if not storing the exact same content', async () => {
      const defer = pDefer()

      const supportedMultiaddrsA = [addr1, addr2]
      const supportedMultiaddrsB = [addr2]

      let changeCounter = 0
      peerStore.on('change:multiaddrs', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.resolve()
        }
      })

      // set 1
      await ab.set(peerId, supportedMultiaddrsA)

      // set 2 (same content)
      await ab.set(peerId, supportedMultiaddrsB)
      const addresses = await ab.get(peerId)
      const multiaddrs = addresses.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(supportedMultiaddrsB)

      await defer.promise
    })

    it('does not emit on set if it is storing the exact same content', async () => {
      const defer = pDefer()

      const supportedMultiaddrs = [addr1, addr2]

      let changeCounter = 0
      peerStore.on('change:multiaddrs', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.reject()
        }
      })

      // set 1
      await ab.set(peerId, supportedMultiaddrs)

      // set 2 (same content)
      await ab.set(peerId, supportedMultiaddrs)

      // Wait 50ms for incorrect second event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      await defer.promise
    })
  })

  describe('addressBook.add', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {AddressBook} */
    let ab

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      ab = peerStore.addressBook
    })

    afterEach(() => {
      peerStore.removeAllListeners()
    })

    it('throwns invalid parameters error if invalid PeerId is provided', async () => {
      try {
        await ab.add('invalid peerId')
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('throwns invalid parameters error if no addresses provided', async () => {
      try {
        await ab.add(peerId)
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('no addresses provided should throw error')
    })

    it('throwns invalid parameters error if invalid multiaddrs are provided', async () => {
      try {
        await ab.add(peerId, ['invalid multiaddr'])
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid multiaddr should throw error')
    })

    it('does not emit event if no addresses are added', async () => {
      const defer = pDefer()

      peerStore.on('peer', () => {
        defer.reject()
      })

      await ab.add(peerId, [])

      // Wait 50ms for incorrect second event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      await defer.promise
    })

    it('adds the new content and emits change event', async () => {
      const defer = pDefer()

      const supportedMultiaddrsA = [addr1, addr2]
      const supportedMultiaddrsB = [addr3]
      const finalMultiaddrs = supportedMultiaddrsA.concat(supportedMultiaddrsB)

      let changeTrigger = 2
      peerStore.on('change:multiaddrs', ({ multiaddrs }) => {
        changeTrigger--
        if (changeTrigger === 0 && arrayEquals(multiaddrs, finalMultiaddrs)) {
          defer.resolve()
        }
      })

      // Replace
      await ab.set(peerId, supportedMultiaddrsA)
      let addresses = await ab.get(peerId)
      let multiaddrs = addresses.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(supportedMultiaddrsA)

      // Add
      await ab.add(peerId, supportedMultiaddrsB)
      addresses = await ab.get(peerId)
      multiaddrs = addresses.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(finalMultiaddrs)

      return defer.promise
    })

    it('emits on add if the content to add not exists', async () => {
      const defer = pDefer()

      const supportedMultiaddrsA = [addr1]
      const supportedMultiaddrsB = [addr2]
      const finalMultiaddrs = supportedMultiaddrsA.concat(supportedMultiaddrsB)

      let changeCounter = 0
      peerStore.on('change:multiaddrs', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.resolve()
        }
      })

      // set 1
      await ab.set(peerId, supportedMultiaddrsA)

      // set 2 (content already existing)
      await ab.add(peerId, supportedMultiaddrsB)
      const addresses = await ab.get(peerId)
      const multiaddrs = addresses.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(finalMultiaddrs)

      await defer.promise
    })

    it('does not emit on add if the content to add already exists', async () => {
      const defer = pDefer()

      const supportedMultiaddrsA = [addr1, addr2]
      const supportedMultiaddrsB = [addr2]

      let changeCounter = 0
      peerStore.on('change:multiaddrs', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.reject()
        }
      })

      // set 1
      await ab.set(peerId, supportedMultiaddrsA)

      // set 2 (content already existing)
      await ab.add(peerId, supportedMultiaddrsB)

      // Wait 50ms for incorrect second event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      await defer.promise
    })

    it('does not add replicated content', async () => {
      // set 1
      await ab.set(peerId, [addr1, addr1])

      const addresses = await ab.get(peerId)
      expect(addresses).to.have.lengthOf(1)
    })
  })

  describe('addressBook.get', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {AddressBook} */
    let ab

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      ab = peerStore.addressBook
    })

    it('throwns invalid parameters error if invalid PeerId is provided', async () => {
      try {
        await ab.get('invalid peerId')
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('returns empty if no multiaddrs are known for the provided peer', async () => {
      const addresses = await ab.get(peerId)

      expect(addresses).to.be.empty()
    })

    it('returns the multiaddrs stored', async () => {
      const supportedMultiaddrs = [addr1, addr2]

      await ab.set(peerId, supportedMultiaddrs)

      const addresses = await ab.get(peerId)
      const multiaddrs = addresses.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(supportedMultiaddrs)
    })
  })

  describe('addressBook.getMultiaddrsForPeer', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {AddressBook} */
    let ab

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      ab = peerStore.addressBook
    })

    it('throwns invalid parameters error if invalid PeerId is provided', async () => {
      try {
        await ab.getMultiaddrsForPeer('invalid peerId')
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('returns empty if no multiaddrs are known for the provided peer', async () => {
      const addresses = await ab.getMultiaddrsForPeer(peerId)

      expect(addresses).to.be.empty()
    })

    it('returns the multiaddrs stored', async () => {
      const supportedMultiaddrs = [addr1, addr2]

      await ab.set(peerId, supportedMultiaddrs)

      const multiaddrs = await ab.getMultiaddrsForPeer(peerId)
      multiaddrs.forEach((m) => {
        expect(m.getPeerId()).to.equal(peerId.toB58String())
      })
    })

    it('can sort multiaddrs providing a sorter', async () => {
      const supportedMultiaddrs = [addr1, addr2]
      await ab.set(peerId, supportedMultiaddrs)

      const multiaddrs = await ab.getMultiaddrsForPeer(peerId, addressSort.publicAddressesFirst)
      const sortedAddresses = addressSort.publicAddressesFirst(supportedMultiaddrs.map((m) => ({ multiaddr: m })))

      multiaddrs.forEach((m, index) => {
        expect(m.equals(sortedAddresses[index].multiaddr))
      })
    })
  })

  describe('addressBook.delete', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {AddressBook} */
    let ab

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      ab = peerStore.addressBook
    })

    it('throwns invalid parameters error if invalid PeerId is provided', async () => {
      try {
        await ab.delete('invalid peerId')
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('does not emit an event if no records exist for the peer', async () => {
      const defer = pDefer()

      peerStore.on('change:multiaddrs', () => {
        defer.reject()
      })

      await ab.delete(peerId)

      // Wait 50ms for incorrect invalid event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })

    it('emits an event if the record exists', async () => {
      const defer = pDefer()

      const supportedMultiaddrs = [addr1, addr2]
      await ab.set(peerId, supportedMultiaddrs)

      // Listen after set
      peerStore.on('change:multiaddrs', ({ multiaddrs }) => {
        expect(multiaddrs.length).to.eql(0)
        defer.resolve()
      })

      await ab.delete(peerId)

      return defer.promise
    })
  })

  describe('certified records', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {AddressBook} */
    let ab

    describe('consumes a valid peer record and stores its data', () => {
      beforeEach(() => {
        peerStore = new PeerStore({
          peerId,
          datastore: new MemoryDatastore()
        })
        ab = peerStore.addressBook
      })

      it('no previous data in AddressBook', async () => {
        const multiaddrs = [addr1, addr2]
        const peerRecord = new PeerRecord({
          peerId,
          multiaddrs
        })
        const envelope = await Envelope.seal(peerRecord, peerId)

        // consume peer record
        const consumed = await ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(true)

        // Validate AddressBook addresses
        const addrs = await ab.get(peerId)
        expect(addrs).to.exist()
        expect(addrs).to.have.lengthOf(multiaddrs.length)
        addrs.forEach((addr, index) => {
          expect(addr.isCertified).to.eql(true)
          expect(multiaddrs[index].equals(addr.multiaddr)).to.eql(true)
        })
      })

      it('emits change:multiaddrs event when adding multiaddrs', async () => {
        const defer = pDefer()
        const multiaddrs = [addr1, addr2]
        const peerRecord = new PeerRecord({
          peerId,
          multiaddrs
        })
        const envelope = await Envelope.seal(peerRecord, peerId)

        peerStore.once('change:multiaddrs', ({ peerId, multiaddrs }) => {
          expect(peerId).to.exist()
          expect(multiaddrs).to.eql(multiaddrs)
          defer.resolve()
        })

        // consume peer record
        const consumed = await ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(true)

        return defer.promise
      })

      it('emits change:multiaddrs event with same data currently in AddressBook (not certified)', async () => {
        const defer = pDefer()
        const multiaddrs = [addr1, addr2]

        // Set addressBook data
        await ab.set(peerId, multiaddrs)

        // Validate data exists, but not certified
        let addrs = await ab.get(peerId)
        expect(addrs).to.exist()
        expect(addrs).to.have.lengthOf(multiaddrs.length)

        addrs.forEach((addr, index) => {
          expect(addr.isCertified).to.eql(false)
          expect(multiaddrs[index].equals(addr.multiaddr)).to.eql(true)
        })

        // Create peer record
        const peerRecord = new PeerRecord({
          peerId,
          multiaddrs
        })
        const envelope = await Envelope.seal(peerRecord, peerId)

        peerStore.once('change:multiaddrs', ({ peerId, multiaddrs }) => {
          expect(peerId).to.exist()
          expect(multiaddrs).to.eql(multiaddrs)
          defer.resolve()
        })

        // consume peer record
        const consumed = await ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(true)

        // Wait event
        await defer.promise

        // Validate data exists and certified
        addrs = await ab.get(peerId)
        expect(addrs).to.exist()
        expect(addrs).to.have.lengthOf(multiaddrs.length)
        addrs.forEach((addr, index) => {
          expect(addr.isCertified).to.eql(true)
          expect(multiaddrs[index].equals(addr.multiaddr)).to.eql(true)
        })
      })

      it('emits change:multiaddrs event with previous partial data in AddressBook (not certified)', async () => {
        const defer = pDefer()
        const multiaddrs = [addr1, addr2]

        // Set addressBook data
        await ab.set(peerId, [addr1])

        // Validate data exists, but not certified
        let addrs = await ab.get(peerId)
        expect(addrs).to.exist()
        expect(addrs).to.have.lengthOf(1)
        expect(addrs[0].isCertified).to.eql(false)
        expect(addrs[0].multiaddr.equals(addr1)).to.eql(true)

        // Create peer record
        const peerRecord = new PeerRecord({
          peerId,
          multiaddrs
        })
        const envelope = await Envelope.seal(peerRecord, peerId)

        peerStore.once('change:multiaddrs', ({ peerId, multiaddrs }) => {
          expect(peerId).to.exist()
          expect(multiaddrs).to.eql(multiaddrs)
          defer.resolve()
        })

        // consume peer record
        const consumed = await ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(true)

        // Wait event
        await defer.promise

        // Validate data exists and certified
        addrs = await ab.get(peerId)
        expect(addrs).to.exist()
        expect(addrs).to.have.lengthOf(multiaddrs.length)
        addrs.forEach((addr, index) => {
          expect(addr.isCertified).to.eql(true)
          expect(multiaddrs[index].equals(addr.multiaddr)).to.eql(true)
        })
      })

      it('with previous different data in AddressBook (not certified)', async () => {
        const defer = pDefer()
        const multiaddrsUncertified = [addr3]
        const multiaddrsCertified = [addr1, addr2]

        // Set addressBook data
        await ab.set(peerId, multiaddrsUncertified)

        // Validate data exists, but not certified
        let addrs = await ab.get(peerId)
        expect(addrs).to.exist()
        expect(addrs).to.have.lengthOf(multiaddrsUncertified.length)
        addrs.forEach((addr, index) => {
          expect(addr.isCertified).to.eql(false)
          expect(multiaddrsUncertified[index].equals(addr.multiaddr)).to.eql(true)
        })

        // Create peer record
        const peerRecord = new PeerRecord({
          peerId,
          multiaddrs: multiaddrsCertified
        })
        const envelope = await Envelope.seal(peerRecord, peerId)

        peerStore.once('change:multiaddrs', ({ peerId, multiaddrs }) => {
          expect(peerId).to.exist()
          expect(multiaddrs).to.eql(multiaddrs)
          defer.resolve()
        })

        // consume peer record
        const consumed = await ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(true)

        // Wait event
        await defer.promise

        // Validate data exists and certified
        addrs = await ab.get(peerId)
        expect(addrs).to.exist()
        expect(addrs).to.have.lengthOf(multiaddrsCertified.length)
        addrs.forEach((addr, index) => {
          expect(addr.isCertified).to.eql(true)
          expect(multiaddrsCertified[index].equals(addr.multiaddr)).to.eql(true)
        })
      })
    })

    describe('fails to consume invalid peer records', () => {
      beforeEach(() => {
        peerStore = new PeerStore({
          peerId,
          datastore: new MemoryDatastore()
        })
        ab = peerStore.addressBook
      })

      it('invalid peer record', async () => {
        const invalidEnvelope = {
          payload: Buffer.from('invalid-peerRecord')
        }

        const consumed = await ab.consumePeerRecord(invalidEnvelope)
        expect(consumed).to.eql(false)
      })

      it('peer that created the envelope is not the same as the peer record', async () => {
        const multiaddrs = [addr1, addr2]

        // Create peer record
        const peerId2 = await PeerId.create()
        const peerRecord = new PeerRecord({
          peerId: peerId2,
          multiaddrs
        })
        const envelope = await Envelope.seal(peerRecord, peerId)

        const consumed = await ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(false)
      })

      it('does not store an outdated record', async () => {
        const multiaddrs = [addr1, addr2]
        const peerRecord1 = new PeerRecord({
          peerId,
          multiaddrs,
          seqNumber: Date.now()
        })
        const peerRecord2 = new PeerRecord({
          peerId,
          multiaddrs,
          seqNumber: Date.now() - 1
        })
        const envelope1 = await Envelope.seal(peerRecord1, peerId)
        const envelope2 = await Envelope.seal(peerRecord2, peerId)

        // Consume envelope1 (bigger seqNumber)
        let consumed = await ab.consumePeerRecord(envelope1)
        expect(consumed).to.eql(true)

        consumed = await ab.consumePeerRecord(envelope2)
        expect(consumed).to.eql(false)
      })

      it('empty multiaddrs', async () => {
        const peerRecord = new PeerRecord({
          peerId,
          multiaddrs: []
        })
        const envelope = await Envelope.seal(peerRecord, peerId)

        const consumed = await ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(false)
      })
    })
  })
})
