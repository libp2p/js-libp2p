'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const { MemoryDatastore } = require('datastore-core/memory')
const pDefer = require('p-defer')
const PeerStore = require('../../src/peer-store')

const peerUtils = require('../utils/creators/peer')
const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../../src/errors')

/**
 * @typedef {import('../../src/peer-store/types').PeerStore} PeerStore
 * @typedef {import('../../src/peer-store/types').MetadataBook} MetadataBook
 * @typedef {import('peer-id')} PeerId
 */

describe('metadataBook', () => {
  /** @type {PeerId} */
  let peerId

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
  })

  describe('metadataBook.set', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {MetadataBook} */
    let mb

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      mb = peerStore.metadataBook
    })

    afterEach(() => {
      peerStore.removeAllListeners()
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      try {
        await mb.set('invalid peerId')
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('throws invalid parameters error if no metadata provided', async () => {
      try {
        await mb.set(peerId)
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('no key provided should throw error')
    })

    it('throws invalid parameters error if no value provided', async () => {
      try {
        await mb.setValue(peerId, 'location')
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('no value provided should throw error')
    })

    it('throws invalid parameters error if value is not a buffer', async () => {
      try {
        await mb.setValue(peerId, 'location', 'mars')
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid value provided should throw error')
    })

    it('stores the content and emit change event', async () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue = uint8ArrayFromString('mars')

      peerStore.once('change:metadata', ({ peerId, metadata }) => {
        expect(peerId).to.exist()
        expect(metadata.get(metadataKey)).to.equalBytes(metadataValue)
        defer.resolve()
      })

      await mb.setValue(peerId, metadataKey, metadataValue)

      const value = await mb.getValue(peerId, metadataKey)
      expect(value).to.equalBytes(metadataValue)

      const peerMetadata = await mb.get(peerId)
      expect(peerMetadata).to.exist()
      expect(peerMetadata.get(metadataKey)).to.equalBytes(metadataValue)

      return defer.promise
    })

    it('emits on set if not storing the exact same content', async () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue1 = uint8ArrayFromString('mars')
      const metadataValue2 = uint8ArrayFromString('saturn')

      let changeCounter = 0
      peerStore.on('change:metadata', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.resolve()
        }
      })

      // set 1
      await mb.setValue(peerId, metadataKey, metadataValue1)

      // set 2 (same content)
      await mb.setValue(peerId, metadataKey, metadataValue2)

      const value = await mb.getValue(peerId, metadataKey)
      expect(value).to.equalBytes(metadataValue2)

      const peerMetadata = await mb.get(peerId)
      expect(peerMetadata).to.exist()
      expect(peerMetadata.get(metadataKey)).to.equalBytes(metadataValue2)

      return defer.promise
    })

    it('does not emit on set if it is storing the exact same content', async () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue = uint8ArrayFromString('mars')

      let changeCounter = 0
      peerStore.on('change:metadata', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.reject()
        }
      })

      // set 1
      await mb.setValue(peerId, metadataKey, metadataValue)

      // set 2 (same content)
      await mb.setValue(peerId, metadataKey, metadataValue)

      // Wait 50ms for incorrect second event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })
  })

  describe('metadataBook.get', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {MetadataBook} */
    let mb

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      mb = peerStore.metadataBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      try {
        await mb.get('invalid peerId')
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('returns empty if no metadata is known for the provided peer', async () => {
      const metadata = await mb.get(peerId)

      expect(metadata).to.be.empty()
    })

    it('returns the metadata stored', async () => {
      const metadataKey = 'location'
      const metadataValue = uint8ArrayFromString('mars')
      const metadata = new Map()
      metadata.set(metadataKey, metadataValue)

      await mb.set(peerId, metadata)

      const peerMetadata = await mb.get(peerId)
      expect(peerMetadata).to.exist()
      expect(peerMetadata.get(metadataKey)).to.equalBytes(metadataValue)
    })
  })

  describe('metadataBook.getValue', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {MetadataBook} */
    let mb

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      mb = peerStore.metadataBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      try {
        await mb.getValue('invalid peerId')
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('returns undefined if no metadata is known for the provided peer', async () => {
      const metadataKey = 'location'
      const metadata = await mb.getValue(peerId, metadataKey)

      expect(metadata).to.not.exist()
    })

    it('returns the metadata value stored for the given key', async () => {
      const metadataKey = 'location'
      const metadataValue = uint8ArrayFromString('mars')

      await mb.setValue(peerId, metadataKey, metadataValue)

      const value = await mb.getValue(peerId, metadataKey)
      expect(value).to.exist()
      expect(value).to.equalBytes(metadataValue)
    })

    it('returns undefined if no metadata is known for the provided peer and key', async () => {
      const metadataKey = 'location'
      const metadataBadKey = 'nickname'
      const metadataValue = uint8ArrayFromString('mars')

      await mb.setValue(peerId, metadataKey, metadataValue)

      const metadata = await mb.getValue(peerId, metadataBadKey)
      expect(metadata).to.not.exist()
    })
  })

  describe('metadataBook.delete', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {MetadataBook} */
    let mb

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      mb = peerStore.metadataBook
    })

    it('throwns invalid parameters error if invalid PeerId is provided', async () => {
      try {
        await mb.delete('invalid peerId')
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('should not emit event if no records exist for the peer', async () => {
      const defer = pDefer()

      peerStore.on('change:metadata', () => {
        defer.reject()
      })

      await mb.delete(peerId)

      // Wait 50ms for incorrect invalid event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })

    it('should emit an event if the record exists for the peer', async () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue = uint8ArrayFromString('mars')

      await mb.setValue(peerId, metadataKey, metadataValue)

      // Listen after set
      peerStore.on('change:metadata', () => {
        defer.resolve()
      })

      await mb.delete(peerId)

      return defer.promise
    })
  })

  describe('metadataBook.deleteValue', () => {
    /** @type {PeerStore} */
    let peerStore
    /** @type {MetadataBook} */
    let mb

    beforeEach(() => {
      peerStore = new PeerStore({
        peerId,
        datastore: new MemoryDatastore()
      })
      mb = peerStore.metadataBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      try {
        await mb.deleteValue('invalid peerId')
      } catch (/** @type {any} */ err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('should not emit event if no records exist for the peer', async () => {
      const defer = pDefer()
      const metadataKey = 'location'

      peerStore.on('change:metadata', () => {
        defer.reject()
      })

      await mb.deleteValue(peerId, metadataKey)

      // Wait 50ms for incorrect invalid event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })

    it('should emit event if a record exists for the peer', async () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue = uint8ArrayFromString('mars')

      await mb.setValue(peerId, metadataKey, metadataValue)

      // Listen after set
      peerStore.on('change:metadata', () => {
        defer.resolve()
      })

      await mb.deleteValue(peerId, metadataKey)

      return defer.promise
    })
  })
})
