'use strict'
/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const { Buffer } = require('buffer')
const multiaddr = require('multiaddr')
const arrayEquals = require('libp2p-utils/src/array-equals')
const PeerId = require('peer-id')
const pDefer = require('p-defer')

const PeerStore = require('../../src/peer-store')
const Envelope = require('../../src/record/envelope')
const PeerRecord = require('../../src/record/peer-record')

const peerUtils = require('../utils/creators/peer')
const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../../src/errors')

const addr1 = multiaddr('/ip4/127.0.0.1/tcp/8000')
const addr2 = multiaddr('/ip4/127.0.0.1/tcp/8001')
const addr3 = multiaddr('/ip4/127.0.0.1/tcp/8002')

describe('addressBook', () => {
  let peerId

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
  })

  describe('addressBook.set', () => {
    let peerStore, ab

    beforeEach(() => {
      peerStore = new PeerStore()
      ab = peerStore.addressBook
    })

    afterEach(() => {
      peerStore.removeAllListeners()
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      try {
        ab.set('invalid peerId')
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('throwns invalid parameters error if no addresses provided', () => {
      try {
        ab.set(peerId)
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('no addresses should throw error')
    })

    it('throwns invalid parameters error if invalid multiaddrs are provided', () => {
      try {
        ab.set(peerId, ['invalid multiaddr'])
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid multiaddrs should throw error')
    })

    it('replaces the stored content by default and emit change event', () => {
      const defer = pDefer()
      const supportedMultiaddrs = [addr1, addr2]

      peerStore.once('change:multiaddrs', ({ peerId, multiaddrs }) => {
        expect(peerId).to.exist()
        expect(multiaddrs).to.eql(supportedMultiaddrs)
        defer.resolve()
      })

      ab.set(peerId, supportedMultiaddrs)
      const addresses = ab.get(peerId)
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
      ab.set(peerId, supportedMultiaddrsA)

      // set 2 (same content)
      ab.set(peerId, supportedMultiaddrsB)
      const addresses = ab.get(peerId)
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
      ab.set(peerId, supportedMultiaddrs)

      // set 2 (same content)
      ab.set(peerId, supportedMultiaddrs)

      // Wait 50ms for incorrect second event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      await defer.promise
    })
  })

  describe('addressBook.add', () => {
    let peerStore, ab

    beforeEach(() => {
      peerStore = new PeerStore()
      ab = peerStore.addressBook
    })

    afterEach(() => {
      peerStore.removeAllListeners()
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      try {
        ab.add('invalid peerId')
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('throwns invalid parameters error if no addresses provided', () => {
      try {
        ab.add(peerId)
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('no addresses provided should throw error')
    })

    it('throwns invalid parameters error if invalid multiaddrs are provided', () => {
      try {
        ab.add(peerId, ['invalid multiaddr'])
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid multiaddr should throw error')
    })

    it('adds the new content and emits change event', () => {
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
      ab.set(peerId, supportedMultiaddrsA)
      let addresses = ab.get(peerId)
      let multiaddrs = addresses.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(supportedMultiaddrsA)

      // Add
      ab.add(peerId, supportedMultiaddrsB)
      addresses = ab.get(peerId)
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
      ab.set(peerId, supportedMultiaddrsA)

      // set 2 (content already existing)
      ab.add(peerId, supportedMultiaddrsB)
      const addresses = ab.get(peerId)
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
      ab.set(peerId, supportedMultiaddrsA)

      // set 2 (content already existing)
      ab.add(peerId, supportedMultiaddrsB)

      // Wait 50ms for incorrect second event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      await defer.promise
    })
  })

  describe('addressBook.get', () => {
    let peerStore, ab

    beforeEach(() => {
      peerStore = new PeerStore()
      ab = peerStore.addressBook
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      try {
        ab.get('invalid peerId')
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('returns undefined if no multiaddrs are known for the provided peer', () => {
      const addresses = ab.get(peerId)

      expect(addresses).to.not.exist()
    })

    it('returns the multiaddrs stored', () => {
      const supportedMultiaddrs = [addr1, addr2]

      ab.set(peerId, supportedMultiaddrs)

      const addresses = ab.get(peerId)
      const multiaddrs = addresses.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(supportedMultiaddrs)
    })
  })

  describe('addressBook.getMultiaddrsForPeer', () => {
    let peerStore, ab

    beforeEach(() => {
      peerStore = new PeerStore()
      ab = peerStore.addressBook
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      try {
        ab.getMultiaddrsForPeer('invalid peerId')
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('returns undefined if no multiaddrs are known for the provided peer', () => {
      const addresses = ab.getMultiaddrsForPeer(peerId)

      expect(addresses).to.not.exist()
    })

    it('returns the multiaddrs stored', () => {
      const supportedMultiaddrs = [addr1, addr2]

      ab.set(peerId, supportedMultiaddrs)

      const multiaddrs = ab.getMultiaddrsForPeer(peerId)
      multiaddrs.forEach((m) => {
        expect(m.getPeerId()).to.equal(peerId.toB58String())
      })
    })
  })

  describe('addressBook.delete', () => {
    let peerStore, ab

    beforeEach(() => {
      peerStore = new PeerStore()
      ab = peerStore.addressBook
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      try {
        ab.delete('invalid peerId')
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('returns false if no records exist for the peer and no event is emitted', () => {
      const defer = pDefer()

      peerStore.on('change:multiaddrs', () => {
        defer.reject()
      })

      const deleted = ab.delete(peerId)

      expect(deleted).to.equal(false)

      // Wait 50ms for incorrect invalid event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })

    it('returns true if the record exists and an event is emitted', () => {
      const defer = pDefer()

      const supportedMultiaddrs = [addr1, addr2]
      ab.set(peerId, supportedMultiaddrs)

      // Listen after set
      peerStore.on('change:multiaddrs', ({ multiaddrs }) => {
        expect(multiaddrs.length).to.eql(0)
        defer.resolve()
      })

      const deleted = ab.delete(peerId)

      expect(deleted).to.equal(true)

      return defer.promise
    })
  })

  describe('certified records', () => {
    let peerStore, ab

    describe('consumes successfully a valid peer record and stores its data', () => {
      beforeEach(() => {
        peerStore = new PeerStore()
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
        const consumed = ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(true)

        // Validate stored envelope
        const storedEnvelope = await ab.getPeerRecord(peerId)
        expect(envelope.isEqual(storedEnvelope)).to.eql(true)

        // Validate AddressBook addresses
        const addrs = ab.get(peerId)
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
        const consumed = ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(true)

        return defer.promise
      })

      it('with same data currently in AddressBook (not certified)', async () => {
        const multiaddrs = [addr1, addr2]

        // Set addressBook data
        ab.set(peerId, multiaddrs)

        // Validate data exists, but not certified
        let addrs = ab.get(peerId)
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

        // consume peer record
        const consumed = ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(true)

        // Validate data exists and certified
        addrs = ab.get(peerId)
        expect(addrs).to.exist()
        expect(addrs).to.have.lengthOf(multiaddrs.length)
        addrs.forEach((addr, index) => {
          expect(addr.isCertified).to.eql(true)
          expect(multiaddrs[index].equals(addr.multiaddr)).to.eql(true)
        })
      })

      it('with previous partial data in AddressBook (not certified)', async () => {
        const multiaddrs = [addr1, addr2]

        // Set addressBook data
        ab.set(peerId, [addr1])

        // Validate data exists, but not certified
        let addrs = ab.get(peerId)
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

        // consume peer record
        const consumed = ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(true)

        // Validate data exists and certified
        addrs = ab.get(peerId)
        expect(addrs).to.exist()
        expect(addrs).to.have.lengthOf(multiaddrs.length)
        addrs.forEach((addr, index) => {
          expect(addr.isCertified).to.eql(true)
          expect(multiaddrs[index].equals(addr.multiaddr)).to.eql(true)
        })
      })

      it('with previous different data in AddressBook (not certified)', async () => {
        const multiaddrsUncertified = [addr3]
        const multiaddrsCertified = [addr1, addr2]

        // Set addressBook data
        ab.set(peerId, multiaddrsUncertified)

        // Validate data exists, but not certified
        let addrs = ab.get(peerId)
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

        // consume peer record
        const consumed = ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(true)

        // Validate data exists and certified
        addrs = ab.get(peerId)
        expect(addrs).to.exist()
        expect(addrs).to.have.lengthOf(multiaddrsCertified.length)
        addrs.forEach((addr, index) => {
          expect(addr.isCertified).to.eql(true)
          expect(multiaddrsCertified[index].equals(addr.multiaddr)).to.eql(true)
        })
        // TODO: should it has the older one?
      })
    })

    describe('fails to consume invalid peer records', () => {
      beforeEach(() => {
        peerStore = new PeerStore()
        ab = peerStore.addressBook
      })

      it('invalid peer record', () => {
        const invalidEnvelope = {
          payload: Buffer.from('invalid-peerRecord')
        }

        const consumed = ab.consumePeerRecord(invalidEnvelope)
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

        const consumed = ab.consumePeerRecord(envelope)
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
        let consumed = ab.consumePeerRecord(envelope1)
        expect(consumed).to.eql(true)

        consumed = ab.consumePeerRecord(envelope2)
        expect(consumed).to.eql(false)
      })

      it('empty multiaddrs', async () => {
        const peerRecord = new PeerRecord({
          peerId,
          multiaddrs: []
        })
        const envelope = await Envelope.seal(peerRecord, peerId)

        const consumed = ab.consumePeerRecord(envelope)
        expect(consumed).to.eql(false)
      })
    })
  })
})
