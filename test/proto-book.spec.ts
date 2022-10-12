/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { MemoryDatastore } from 'datastore-core/memory'
import pDefer from 'p-defer'
import pWaitFor from 'p-wait-for'
import { PersistentPeerStore } from '../src/index.js'
import { codes } from '../src/errors.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { ProtoBook } from '@libp2p/interface-peer-store'

const arraysAreEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false
  }

  return a.sort().every((item, index) => b[index] === item)
}

describe('protoBook', () => {
  let peerId: PeerId

  before(async () => {
    peerId = await createEd25519PeerId()
  })

  describe('protoBook.set', () => {
    let peerStore: PersistentPeerStore
    let pb: ProtoBook

    beforeEach(() => {
      peerStore = new PersistentPeerStore({ peerId, datastore: new MemoryDatastore() })
      pb = peerStore.protoBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      // @ts-expect-error invalid input
      await expect(pb.set('invalid peerId')).to.eventually.be.rejected().with.property('code', codes.ERR_INVALID_PARAMETERS)
    })

    it('throws invalid parameters error if no protocols provided', async () => {
      // @ts-expect-error invalid input
      await expect(pb.set(peerId)).to.eventually.be.rejected().with.property('code', codes.ERR_INVALID_PARAMETERS)
    })

    it('replaces the stored content by default and emit change event', async () => {
      const defer = pDefer()
      const supportedProtocols = ['protocol1', 'protocol2']

      peerStore.addEventListener('change:protocols', (evt) => {
        const { peerId, protocols } = evt.detail
        expect(peerId).to.exist()
        expect(protocols).to.have.deep.members(supportedProtocols)
        defer.resolve()
      }, {
        once: true
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
      peerStore.addEventListener('change:protocols', () => {
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
      peerStore.addEventListener('change:protocols', () => {
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

      return await defer.promise
    })
  })

  describe('protoBook.add', () => {
    let peerStore: PersistentPeerStore
    let pb: ProtoBook

    beforeEach(() => {
      peerStore = new PersistentPeerStore({ peerId, datastore: new MemoryDatastore() })
      pb = peerStore.protoBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      // @ts-expect-error invalid input
      await expect(pb.add('invalid peerId')).to.eventually.be.rejected().with.property('code', codes.ERR_INVALID_PARAMETERS)
    })

    it('throws invalid parameters error if no protocols provided', async () => {
      // @ts-expect-error invalid input
      await expect(pb.add(peerId)).to.eventually.be.rejected().with.property('code', codes.ERR_INVALID_PARAMETERS)
    })

    it('adds the new content and emits change event', async () => {
      const defer = pDefer()

      const supportedProtocolsA = ['protocol1', 'protocol2']
      const supportedProtocolsB = ['protocol3']
      const finalProtocols = supportedProtocolsA.concat(supportedProtocolsB)

      let changeTrigger = 2
      peerStore.addEventListener('change:protocols', (evt) => {
        const { protocols } = evt.detail
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

      return await defer.promise
    })

    it('emits on add if the content to add not exists', async () => {
      const defer = pDefer()

      const supportedProtocolsA = ['protocol1']
      const supportedProtocolsB = ['protocol2']
      const finalProtocols = supportedProtocolsA.concat(supportedProtocolsB)

      let changeCounter = 0
      peerStore.addEventListener('change:protocols', () => {
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

      return await defer.promise
    })

    it('does not emit on add if the content to add already exists', async () => {
      const defer = pDefer()

      const supportedProtocolsA = ['protocol1', 'protocol2']
      const supportedProtocolsB = ['protocol2']

      let changeCounter = 0
      peerStore.addEventListener('change:protocols', () => {
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

      return await defer.promise
    })
  })

  describe('protoBook.remove', () => {
    let peerStore: PersistentPeerStore
    let pb: ProtoBook

    beforeEach(() => {
      peerStore = new PersistentPeerStore({ peerId, datastore: new MemoryDatastore() })
      pb = peerStore.protoBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      // @ts-expect-error invalid input
      await expect(pb.remove('invalid peerId')).to.eventually.be.rejected().with.property('code', codes.ERR_INVALID_PARAMETERS)
    })

    it('throws invalid parameters error if no protocols provided', async () => {
      // @ts-expect-error invalid input
      await expect(pb.remove(peerId)).to.eventually.be.rejected().with.property('code', codes.ERR_INVALID_PARAMETERS)
    })

    it('removes the given protocol and emits change event', async () => {
      const spy = sinon.spy()

      const supportedProtocols = ['protocol1', 'protocol2']
      const removedProtocols = ['protocol1']
      const finalProtocols = supportedProtocols.filter(p => !removedProtocols.includes(p))

      peerStore.addEventListener('change:protocols', spy)

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
      expect(arraysAreEqual(firstCallArgs.detail.protocols, supportedProtocols))
      expect(arraysAreEqual(secondCallArgs.detail.protocols, finalProtocols))
    })

    it('emits on remove if the content changes', async () => {
      const spy = sinon.spy()

      const supportedProtocols = ['protocol1', 'protocol2']
      const removedProtocols = ['protocol2']
      const finalProtocols = supportedProtocols.filter(p => !removedProtocols.includes(p))

      peerStore.addEventListener('change:protocols', spy)

      // set
      await pb.set(peerId, supportedProtocols)

      // remove (content already existing)
      await pb.remove(peerId, removedProtocols)
      const protocols = await pb.get(peerId)
      expect(protocols).to.have.deep.members(finalProtocols)

      return await pWaitFor(() => spy.callCount === 2)
    })

    it('does not emit on remove if the content does not change', async () => {
      const spy = sinon.spy()

      const supportedProtocols = ['protocol1', 'protocol2']
      const removedProtocols = ['protocol3']

      peerStore.addEventListener('change:protocols', spy)

      // set
      await pb.set(peerId, supportedProtocols)

      // remove
      await pb.remove(peerId, removedProtocols)

      // Only one event
      expect(spy.callCount).to.eql(1)
    })
  })

  describe('protoBook.get', () => {
    let peerStore: PersistentPeerStore
    let pb: ProtoBook

    beforeEach(() => {
      peerStore = new PersistentPeerStore({ peerId, datastore: new MemoryDatastore() })
      pb = peerStore.protoBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      // @ts-expect-error invalid input
      await expect(pb.get('invalid peerId')).to.eventually.be.rejected().with.property('code', codes.ERR_INVALID_PARAMETERS)
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
    let peerStore: PersistentPeerStore
    let pb: ProtoBook

    beforeEach(() => {
      peerStore = new PersistentPeerStore({ peerId, datastore: new MemoryDatastore() })
      pb = peerStore.protoBook
    })

    it('throws invalid parameters error if invalid PeerId is provided', async () => {
      // @ts-expect-error invalid input
      await expect(pb.delete('invalid peerId')).to.eventually.be.rejected().with.property('code', codes.ERR_INVALID_PARAMETERS)
    })

    it('should not emit event if no records exist for the peer', async () => {
      const defer = pDefer()

      peerStore.addEventListener('change:protocols', () => {
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
      peerStore.addEventListener('change:protocols', (evt) => {
        const { protocols } = evt.detail
        expect(protocols.length).to.eql(0)
        defer.resolve()
      })

      await pb.delete(peerId)

      await defer.promise
    })
  })
})
