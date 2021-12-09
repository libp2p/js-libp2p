'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const { MemoryDatastore } = require('datastore-core/memory')
const pDefer = require('p-defer')
const pWaitFor = require('p-wait-for')

const PeerStore = require('../../src/peer-store')

const peerUtils = require('../utils/creators/peer')
const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../../src/errors')

/**
 * @typedef {import('../../src/peer-store/types').PeerStore} PeerStore
 * @typedef {import('../../src/peer-store/types').ProtoBook} ProtoBook
 * @typedef {import('peer-id')} PeerId
 */

const arraysAreEqual = (a, b) => a.length === b.length && a.sort().every((item, index) => b[index] === item)

describe('protoBook', () => {
  /** @type {PeerId} */
  let peerId

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
  })

  describe('protoBook.set', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {ProtoBook} */
    let pb

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      pb = peerStore.protoBook
    })

    afterEach(() => {
      peerStore.removeAllListeners()
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      await expect(pb.set('invalid peerId')).to.eventually.be.rejected().with.property('code', ERR_INVALID_PARAMETERS)
    })

    it('throws invalid parameters error if no protocols provided', async () => {
      await expect(pb.set(peerId)).to.eventually.be.rejected().with.property('code', ERR_INVALID_PARAMETERS)
    })

    it('replaces the stored content by default and emit change event', async () => {
      const defer = pDefer()
      const supportedProtocols = ['protocol1', 'protocol2']

      peerStore.once('change:protocols', ({ peerId, protocols }) => {
        expect(peerId).to.exist()
        expect(protocols).to.have.deep.members(supportedProtocols)
        defer.resolve()
      })

      await pb.set(peerId, supportedProtocols)
      const protocols = await pb.get(peerId)
      expect(protocols).to.have.deep.members(supportedProtocols)

      await defer.promise
    })

    it('emits on set if not storing the exact same content', async () => {
      const defer = pDefer()

      const supportedProtocolsA = ['protocol1', 'protocol2']
      const supportedProtocolsB = ['protocol2']

      let changeCounter = 0
      peerStore.on('change:protocols', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.resolve()
        }
      })

      // set 1
      await pb.set(peerId, supportedProtocolsA)

      // set 2 (same content)
      await pb.set(peerId, supportedProtocolsB)
      const protocols = await pb.get(peerId)
      expect(protocols).to.have.deep.members(supportedProtocolsB)

      await defer.promise
    })

    it('does not emit on set if it is storing the exact same content', async () => {
      const defer = pDefer()

      const supportedProtocols = ['protocol1', 'protocol2']

      let changeCounter = 0
      peerStore.on('change:protocols', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.reject()
        }
      })

      // set 1
      await pb.set(peerId, supportedProtocols)

      // set 2 (same content)
      await pb.set(peerId, supportedProtocols)

      // Wait 50ms for incorrect second event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })
  })

  describe('protoBook.add', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {ProtoBook} */
    let pb

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      pb = peerStore.protoBook
    })

    afterEach(() => {
      peerStore.removeAllListeners()
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      await expect(pb.add('invalid peerId')).to.eventually.be.rejected().with.property('code', ERR_INVALID_PARAMETERS)
    })

    it('throws invalid parameters error if no protocols provided', async () => {
      await expect(pb.add(peerId)).to.eventually.be.rejected().with.property('code', ERR_INVALID_PARAMETERS)
    })

    it('adds the new content and emits change event', async () => {
      const defer = pDefer()

      const supportedProtocolsA = ['protocol1', 'protocol2']
      const supportedProtocolsB = ['protocol3']
      const finalProtocols = supportedProtocolsA.concat(supportedProtocolsB)

      let changeTrigger = 2
      peerStore.on('change:protocols', ({ protocols }) => {
        changeTrigger--
        if (changeTrigger === 0 && arraysAreEqual(protocols, finalProtocols)) {
          defer.resolve()
        }
      })

      // Replace
      await pb.set(peerId, supportedProtocolsA)
      let protocols = await pb.get(peerId)
      expect(protocols).to.have.deep.members(supportedProtocolsA)

      // Add
      await pb.add(peerId, supportedProtocolsB)
      protocols = await pb.get(peerId)
      expect(protocols).to.have.deep.members(finalProtocols)

      return defer.promise
    })

    it('emits on add if the content to add not exists', async () => {
      const defer = pDefer()

      const supportedProtocolsA = ['protocol1']
      const supportedProtocolsB = ['protocol2']
      const finalProtocols = supportedProtocolsA.concat(supportedProtocolsB)

      let changeCounter = 0
      peerStore.on('change:protocols', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.resolve()
        }
      })

      // set 1
      await pb.set(peerId, supportedProtocolsA)

      // set 2 (content already existing)
      await pb.add(peerId, supportedProtocolsB)
      const protocols = await pb.get(peerId)
      expect(protocols).to.have.deep.members(finalProtocols)

      return defer.promise
    })

    it('does not emit on add if the content to add already exists', async () => {
      const defer = pDefer()

      const supportedProtocolsA = ['protocol1', 'protocol2']
      const supportedProtocolsB = ['protocol2']

      let changeCounter = 0
      peerStore.on('change:protocols', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.reject()
        }
      })

      // set 1
      await pb.set(peerId, supportedProtocolsA)

      // set 2 (content already existing)
      await pb.add(peerId, supportedProtocolsB)

      // Wait 50ms for incorrect second event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })
  })

  describe('protoBook.remove', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {ProtoBook} */
    let pb

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      pb = peerStore.protoBook
    })

    afterEach(() => {
      peerStore.removeAllListeners()
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      await expect(pb.remove('invalid peerId')).to.eventually.be.rejected().with.property('code', ERR_INVALID_PARAMETERS)
    })

    it('throws invalid parameters error if no protocols provided', async () => {
      await expect(pb.remove(peerId)).to.eventually.be.rejected().with.property('code', ERR_INVALID_PARAMETERS)
    })

    it('removes the given protocol and emits change event', async () => {
      const spy = sinon.spy()

      const supportedProtocols = ['protocol1', 'protocol2']
      const removedProtocols = ['protocol1']
      const finalProtocols = supportedProtocols.filter(p => !removedProtocols.includes(p))

      peerStore.on('change:protocols', spy)

      // Replace
      await pb.set(peerId, supportedProtocols)
      let protocols = await pb.get(peerId)
      expect(protocols).to.have.deep.members(supportedProtocols)

      // Remove
      await pb.remove(peerId, removedProtocols)
      protocols = await pb.get(peerId)
      expect(protocols).to.have.deep.members(finalProtocols)

      await pWaitFor(() => spy.callCount === 2)

      const [firstCallArgs] = spy.firstCall.args
      const [secondCallArgs] = spy.secondCall.args
      expect(arraysAreEqual(firstCallArgs.protocols, supportedProtocols))
      expect(arraysAreEqual(secondCallArgs.protocols, finalProtocols))
    })

    it('emits on remove if the content changes', async () => {
      const spy = sinon.spy()

      const supportedProtocols = ['protocol1', 'protocol2']
      const removedProtocols = ['protocol2']
      const finalProtocols = supportedProtocols.filter(p => !removedProtocols.includes(p))

      peerStore.on('change:protocols', spy)

      // set
      await pb.set(peerId, supportedProtocols)

      // remove (content already existing)
      await pb.remove(peerId, removedProtocols)
      const protocols = await pb.get(peerId)
      expect(protocols).to.have.deep.members(finalProtocols)

      return pWaitFor(() => spy.callCount === 2)
    })

    it('does not emit on remove if the content does not change', async () => {
      const spy = sinon.spy()

      const supportedProtocols = ['protocol1', 'protocol2']
      const removedProtocols = ['protocol3']

      peerStore.on('change:protocols', spy)

      // set
      await pb.set(peerId, supportedProtocols)

      // remove
      await pb.remove(peerId, removedProtocols)

      // Only one event
      expect(spy.callCount).to.eql(1)
    })
  })

  describe('protoBook.get', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {ProtoBook} */
    let pb

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      pb = peerStore.protoBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      await expect(pb.get('invalid peerId')).to.eventually.be.rejected().with.property('code', ERR_INVALID_PARAMETERS)
    })

    it('returns empty if no protocols are known for the provided peer', async () => {
      const protocols = await pb.get(peerId)

      expect(protocols).to.be.empty()
    })

    it('returns the protocols stored', async () => {
      const supportedProtocols = ['protocol1', 'protocol2']

      await pb.set(peerId, supportedProtocols)

      const protocols = await pb.get(peerId)
      expect(protocols).to.have.deep.members(supportedProtocols)
    })
  })

  describe('protoBook.delete', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {ProtoBook} */
    let pb

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      pb = peerStore.protoBook
    })

    it('throwns invalid parameters error if invalid PeerId is provided', async () => {
      await expect(pb.delete('invalid peerId')).to.eventually.be.rejected().with.property('code', ERR_INVALID_PARAMETERS)
    })

    it('should not emit event if no records exist for the peer', async () => {
      const defer = pDefer()

      peerStore.on('change:protocols', () => {
        defer.reject()
      })

      await pb.delete(peerId)

      // Wait 50ms for incorrect invalid event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      await defer.promise
    })

    it('should emit event if a record exists for the peer', async () => {
      const defer = pDefer()

      const supportedProtocols = ['protocol1', 'protocol2']
      await pb.set(peerId, supportedProtocols)

      // Listen after set
      peerStore.on('change:protocols', ({ protocols }) => {
        expect(protocols.length).to.eql(0)
        defer.resolve()
      })

      await pb.delete(peerId)

      await defer.promise
    })
  })
})
