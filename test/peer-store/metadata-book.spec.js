'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-bytes'))
const { expect } = chai

const pDefer = require('p-defer')
const PeerStore = require('../../src/peer-store')

const peerUtils = require('../utils/creators/peer')
const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../../src/errors')

describe('metadataBook', () => {
  let peerId

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
  })

  describe('metadataBook.set', () => {
    let peerStore, mb

    beforeEach(() => {
      peerStore = new PeerStore({ peerId })
      mb = peerStore.metadataBook
    })

    afterEach(() => {
      peerStore.removeAllListeners()
    })

    it('throws invalid parameters error if invalid PeerId is provided', () => {
      try {
        mb.set('invalid peerId')
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('throws invalid parameters error if no key provided', () => {
      try {
        mb.set(peerId)
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('no key provided should throw error')
    })

    it('throws invalid parameters error if no value provided', () => {
      try {
        mb.set(peerId, 'location')
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('no value provided should throw error')
    })

    it('throws invalid parameters error if value is not a buffer', () => {
      try {
        mb.set(peerId, 'location', 'mars')
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid value provided should throw error')
    })

    it('stores the content and emit change event', () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue = Buffer.from('mars')

      peerStore.once('change:metadata', ({ peerId, metadata }) => {
        expect(peerId).to.exist()
        expect(metadata).to.equal(metadataKey)
        defer.resolve()
      })

      mb.set(peerId, metadataKey, metadataValue)

      const value = mb.getValue(peerId, metadataKey)
      expect(value).to.equalBytes(metadataValue)

      const peerMetadata = mb.get(peerId)
      expect(peerMetadata).to.exist()
      expect(peerMetadata.get(metadataKey)).to.equalBytes(metadataValue)

      return defer.promise
    })

    it('emits on set if not storing the exact same content', () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue1 = Buffer.from('mars')
      const metadataValue2 = Buffer.from('saturn')

      let changeCounter = 0
      peerStore.on('change:metadata', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.resolve()
        }
      })

      // set 1
      mb.set(peerId, metadataKey, metadataValue1)

      // set 2 (same content)
      mb.set(peerId, metadataKey, metadataValue2)

      const value = mb.getValue(peerId, metadataKey)
      expect(value).to.equalBytes(metadataValue2)

      const peerMetadata = mb.get(peerId)
      expect(peerMetadata).to.exist()
      expect(peerMetadata.get(metadataKey)).to.equalBytes(metadataValue2)

      return defer.promise
    })

    it('does not emit on set if it is storing the exact same content', () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue = Buffer.from('mars')

      let changeCounter = 0
      peerStore.on('change:metadata', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.reject()
        }
      })

      // set 1
      mb.set(peerId, metadataKey, metadataValue)

      // set 2 (same content)
      mb.set(peerId, metadataKey, metadataValue)

      // Wait 50ms for incorrect second event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })
  })

  describe('metadataBook.get', () => {
    let peerStore, mb

    beforeEach(() => {
      peerStore = new PeerStore({ peerId })
      mb = peerStore.metadataBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', () => {
      try {
        mb.get('invalid peerId')
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('returns undefined if no metadata is known for the provided peer', () => {
      const metadata = mb.get(peerId)

      expect(metadata).to.not.exist()
    })

    it('returns the metadata stored', () => {
      const metadataKey = 'location'
      const metadataValue = Buffer.from('mars')

      mb.set(peerId, metadataKey, metadataValue)

      const peerMetadata = mb.get(peerId)
      expect(peerMetadata).to.exist()
      expect(peerMetadata.get(metadataKey)).to.equalBytes(metadataValue)
    })
  })

  describe('metadataBook.getValue', () => {
    let peerStore, mb

    beforeEach(() => {
      peerStore = new PeerStore({ peerId })
      mb = peerStore.metadataBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', () => {
      try {
        mb.getValue('invalid peerId')
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('returns undefined if no metadata is known for the provided peer', () => {
      const metadataKey = 'location'
      const metadata = mb.getValue(peerId, metadataKey)

      expect(metadata).to.not.exist()
    })

    it('returns the metadata value stored for the given key', () => {
      const metadataKey = 'location'
      const metadataValue = Buffer.from('mars')

      mb.set(peerId, metadataKey, metadataValue)

      const value = mb.getValue(peerId, metadataKey)
      expect(value).to.exist()
      expect(value).to.equalBytes(metadataValue)
    })

    it('returns undefined if no metadata is known for the provided peer and key', () => {
      const metadataKey = 'location'
      const metadataBadKey = 'nickname'
      const metadataValue = Buffer.from('mars')

      mb.set(peerId, metadataKey, metadataValue)

      const metadata = mb.getValue(peerId, metadataBadKey)

      expect(metadata).to.not.exist()
    })
  })

  describe('metadataBook.delete', () => {
    let peerStore, mb

    beforeEach(() => {
      peerStore = new PeerStore({ peerId })
      mb = peerStore.metadataBook
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      try {
        mb.delete('invalid peerId')
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('returns false if no records exist for the peer and no event is emitted', () => {
      const defer = pDefer()

      peerStore.on('change:metadata', () => {
        defer.reject()
      })

      const deleted = mb.delete(peerId)

      expect(deleted).to.equal(false)

      // Wait 50ms for incorrect invalid event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })

    it('returns true if the record exists and an event is emitted', () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue = Buffer.from('mars')

      mb.set(peerId, metadataKey, metadataValue)

      // Listen after set
      peerStore.on('change:metadata', () => {
        defer.resolve()
      })

      const deleted = mb.delete(peerId)

      expect(deleted).to.equal(true)

      return defer.promise
    })
  })

  describe('metadataBook.deleteValue', () => {
    let peerStore, mb

    beforeEach(() => {
      peerStore = new PeerStore({ peerId })
      mb = peerStore.metadataBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', () => {
      try {
        mb.deleteValue('invalid peerId')
      } catch (err) {
        expect(err.code).to.equal(ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('returns false if no records exist for the peer and no event is emitted', () => {
      const defer = pDefer()
      const metadataKey = 'location'

      peerStore.on('change:metadata', () => {
        defer.reject()
      })

      const deleted = mb.deleteValue(peerId, metadataKey)

      expect(deleted).to.equal(false)

      // Wait 50ms for incorrect invalid event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })

    it('returns true if the record exists and an event is emitted', () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue = Buffer.from('mars')

      mb.set(peerId, metadataKey, metadataValue)

      // Listen after set
      peerStore.on('change:metadata', () => {
        defer.resolve()
      })

      const deleted = mb.deleteValue(peerId, metadataKey)

      expect(deleted).to.equal(true)

      return defer.promise
    })

    it('returns false if there is a record for the peer but not the given metadata key', () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataBadKey = 'nickname'
      const metadataValue = Buffer.from('mars')

      mb.set(peerId, metadataKey, metadataValue)

      peerStore.on('change:metadata', () => {
        defer.reject()
      })

      const deleted = mb.deleteValue(peerId, metadataBadKey)

      expect(deleted).to.equal(false)

      // Wait 50ms for incorrect invalid event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })
  })
})
