
/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MemoryDatastore } from 'datastore-core/memory'
import pDefer from 'p-defer'
import { PersistentPeerStore } from '../src/index.js'
import { codes } from '../src/errors.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { MetadataBook } from '@libp2p/interfaces/peer-store'
import { Components } from '@libp2p/interfaces/components'

describe('metadataBook', () => {
  let peerId: PeerId

  before(async () => {
    peerId = await createEd25519PeerId()
  })

  describe('metadataBook.set', () => {
    let peerStore: PersistentPeerStore
    let mb: MetadataBook

    beforeEach(() => {
      peerStore = new PersistentPeerStore()
      peerStore.init(new Components({ peerId, datastore: new MemoryDatastore() }))
      mb = peerStore.metadataBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      try {
        // @ts-expect-error invalid input
        await mb.set('invalid peerId')
      } catch (err: any) {
        expect(err.code).to.equal(codes.ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('throws invalid parameters error if no metadata provided', async () => {
      try {
        // @ts-expect-error invalid input
        await mb.set(peerId)
      } catch (err: any) {
        expect(err.code).to.equal(codes.ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('no key provided should throw error')
    })

    it('throws invalid parameters error if no value provided', async () => {
      try {
        // @ts-expect-error invalid input
        await mb.setValue(peerId, 'location')
      } catch (err: any) {
        expect(err.code).to.equal(codes.ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('no value provided should throw error')
    })

    it('throws invalid parameters error if value is not a buffer', async () => {
      try {
        // @ts-expect-error invalid input
        await mb.setValue(peerId, 'location', 'mars')
      } catch (err: any) {
        expect(err.code).to.equal(codes.ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid value provided should throw error')
    })

    it('stores the content and emit change event', async () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue = uint8ArrayFromString('mars')

      peerStore.addEventListener('change:metadata', (evt) => {
        const { peerId, metadata } = evt.detail
        expect(peerId).to.exist()
        expect(metadata.get(metadataKey)).to.equalBytes(metadataValue)
        defer.resolve()
      }, {
        once: true
      })

      await mb.setValue(peerId, metadataKey, metadataValue)

      const value = await mb.getValue(peerId, metadataKey)
      expect(value).to.equalBytes(metadataValue)

      const peerMetadata = await mb.get(peerId)
      expect(peerMetadata).to.exist()
      expect(peerMetadata.get(metadataKey)).to.equalBytes(metadataValue)

      return await defer.promise
    })

    it('emits on set if not storing the exact same content', async () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue1 = uint8ArrayFromString('mars')
      const metadataValue2 = uint8ArrayFromString('saturn')

      let changeCounter = 0
      peerStore.addEventListener('change:metadata', () => {
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

      return await defer.promise
    })

    it('does not emit on set if it is storing the exact same content', async () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue = uint8ArrayFromString('mars')

      let changeCounter = 0
      peerStore.addEventListener('change:metadata', () => {
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

      return await defer.promise
    })
  })

  describe('metadataBook.get', () => {
    let peerStore: PersistentPeerStore
    let mb: MetadataBook

    beforeEach(() => {
      peerStore = new PersistentPeerStore()
      peerStore.init(new Components({ peerId, datastore: new MemoryDatastore() }))
      mb = peerStore.metadataBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      try {
        // @ts-expect-error invalid input
        await mb.get('invalid peerId')
      } catch (err: any) {
        expect(err.code).to.equal(codes.ERR_INVALID_PARAMETERS)
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
    let peerStore: PersistentPeerStore
    let mb: MetadataBook

    beforeEach(() => {
      peerStore = new PersistentPeerStore()
      peerStore.init(new Components({ peerId, datastore: new MemoryDatastore() }))
      mb = peerStore.metadataBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      try {
        // @ts-expect-error invalid input
        await mb.getValue('invalid peerId')
      } catch (err: any) {
        expect(err.code).to.equal(codes.ERR_INVALID_PARAMETERS)
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
    let peerStore: PersistentPeerStore
    let mb: MetadataBook

    beforeEach(() => {
      peerStore = new PersistentPeerStore()
      peerStore.init(new Components({ peerId, datastore: new MemoryDatastore() }))
      mb = peerStore.metadataBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      try {
        // @ts-expect-error invalid input
        await mb.delete('invalid peerId')
      } catch (err: any) {
        expect(err.code).to.equal(codes.ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('should not emit event if no records exist for the peer', async () => {
      const defer = pDefer()

      peerStore.addEventListener('change:metadata', () => {
        defer.reject()
      })

      await mb.delete(peerId)

      // Wait 50ms for incorrect invalid event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return await defer.promise
    })

    it('should emit an event if the record exists for the peer', async () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue = uint8ArrayFromString('mars')

      await mb.setValue(peerId, metadataKey, metadataValue)

      // Listen after set
      peerStore.addEventListener('change:metadata', () => {
        defer.resolve()
      })

      await mb.delete(peerId)

      return await defer.promise
    })
  })

  describe('metadataBook.deleteValue', () => {
    let peerStore: PersistentPeerStore
    let mb: MetadataBook

    beforeEach(() => {
      peerStore = new PersistentPeerStore()
      peerStore.init(new Components({ peerId, datastore: new MemoryDatastore() }))
      mb = peerStore.metadataBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      try {
        // @ts-expect-error invalid input
        await mb.deleteValue('invalid peerId')
      } catch (err: any) {
        expect(err.code).to.equal(codes.ERR_INVALID_PARAMETERS)
        return
      }
      throw new Error('invalid peerId should throw error')
    })

    it('should not emit event if no records exist for the peer', async () => {
      const defer = pDefer()
      const metadataKey = 'location'

      peerStore.addEventListener('change:metadata', () => {
        defer.reject()
      })

      await mb.deleteValue(peerId, metadataKey)

      // Wait 50ms for incorrect invalid event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return await defer.promise
    })

    it('should emit event if a record exists for the peer', async () => {
      const defer = pDefer()
      const metadataKey = 'location'
      const metadataValue = uint8ArrayFromString('mars')

      await mb.setValue(peerId, metadataKey, metadataValue)

      // Listen after set
      peerStore.addEventListener('change:metadata', () => {
        defer.resolve()
      })

      await mb.deleteValue(peerId, metadataKey)

      return await defer.promise
    })
  })
})
