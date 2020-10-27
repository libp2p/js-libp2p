'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const sinon = require('sinon')
const pDefer = require('p-defer')
const pWaitFor = require('p-wait-for')

const PeerStore = require('../../src/peer-store')

const peerUtils = require('../utils/creators/peer')
const {
  ERR_INVALID_PARAMETERS
} = require('../../src/errors')

const arraysAreEqual = (a, b) => a.length === b.length && a.sort().every((item, index) => b[index] === item)

describe('protoBook', () => {
  let peerId

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
  })

  describe('protoBook.set', () => {
    let peerStore, pb

    beforeEach(() => {
      peerStore = new PeerStore({ peerId })
      pb = peerStore.protoBook
    })

    afterEach(() => {
      peerStore.removeAllListeners()
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        pb.set('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('throwns invalid parameters error if no protocols provided', () => {
      expect(() => {
        pb.set(peerId)
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('replaces the stored content by default and emit change event', () => {
      const defer = pDefer()
      const supportedProtocols = ['protocol1', 'protocol2']

      peerStore.once('change:protocols', ({ peerId, protocols }) => {
        expect(peerId).to.exist()
        expect(protocols).to.have.deep.members(supportedProtocols)
        defer.resolve()
      })

      pb.set(peerId, supportedProtocols)
      const protocols = pb.get(peerId)
      expect(protocols).to.have.deep.members(supportedProtocols)

      return defer.promise
    })

    it('emits on set if not storing the exact same content', () => {
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
      pb.set(peerId, supportedProtocolsA)

      // set 2 (same content)
      pb.set(peerId, supportedProtocolsB)
      const protocols = pb.get(peerId)
      expect(protocols).to.have.deep.members(supportedProtocolsB)

      return defer.promise
    })

    it('does not emit on set if it is storing the exact same content', () => {
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
      pb.set(peerId, supportedProtocols)

      // set 2 (same content)
      pb.set(peerId, supportedProtocols)

      // Wait 50ms for incorrect second event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })
  })

  describe('protoBook.add', () => {
    let peerStore, pb

    beforeEach(() => {
      peerStore = new PeerStore({ peerId })
      pb = peerStore.protoBook
    })

    afterEach(() => {
      peerStore.removeAllListeners()
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        pb.add('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('throwns invalid parameters error if no protocols provided', () => {
      expect(() => {
        pb.add(peerId)
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('adds the new content and emits change event', () => {
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
      pb.set(peerId, supportedProtocolsA)
      let protocols = pb.get(peerId)
      expect(protocols).to.have.deep.members(supportedProtocolsA)

      // Add
      pb.add(peerId, supportedProtocolsB)
      protocols = pb.get(peerId)
      expect(protocols).to.have.deep.members(finalProtocols)

      return defer.promise
    })

    it('emits on add if the content to add not exists', () => {
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
      pb.set(peerId, supportedProtocolsA)

      // set 2 (content already existing)
      pb.add(peerId, supportedProtocolsB)
      const protocols = pb.get(peerId)
      expect(protocols).to.have.deep.members(finalProtocols)

      return defer.promise
    })

    it('does not emit on add if the content to add already exists', () => {
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
      pb.set(peerId, supportedProtocolsA)

      // set 2 (content already existing)
      pb.add(peerId, supportedProtocolsB)

      // Wait 50ms for incorrect second event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })
  })

  describe('protoBook.remove', () => {
    let peerStore, pb

    beforeEach(() => {
      peerStore = new PeerStore({ peerId })
      pb = peerStore.protoBook
    })

    afterEach(() => {
      peerStore.removeAllListeners()
    })

    it('throws invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        pb.remove('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('throws invalid parameters error if no protocols provided', () => {
      expect(() => {
        pb.remove(peerId)
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('removes the given protocol and emits change event', async () => {
      const spy = sinon.spy()

      const supportedProtocols = ['protocol1', 'protocol2']
      const removedProtocols = ['protocol1']
      const finalProtocols = supportedProtocols.filter(p => !removedProtocols.includes(p))

      peerStore.on('change:protocols', spy)

      // Replace
      pb.set(peerId, supportedProtocols)
      let protocols = pb.get(peerId)
      expect(protocols).to.have.deep.members(supportedProtocols)

      // Remove
      pb.remove(peerId, removedProtocols)
      protocols = pb.get(peerId)
      expect(protocols).to.have.deep.members(finalProtocols)

      await pWaitFor(() => spy.callCount === 2)

      const [firstCallArgs] = spy.firstCall.args
      const [secondCallArgs] = spy.secondCall.args
      expect(arraysAreEqual(firstCallArgs.protocols, supportedProtocols))
      expect(arraysAreEqual(secondCallArgs.protocols, finalProtocols))
    })

    it('emits on remove if the content changes', () => {
      const spy = sinon.spy()

      const supportedProtocols = ['protocol1', 'protocol2']
      const removedProtocols = ['protocol2']
      const finalProtocols = supportedProtocols.filter(p => !removedProtocols.includes(p))

      peerStore.on('change:protocols', spy)

      // set
      pb.set(peerId, supportedProtocols)

      // remove (content already existing)
      pb.remove(peerId, removedProtocols)
      const protocols = pb.get(peerId)
      expect(protocols).to.have.deep.members(finalProtocols)

      return pWaitFor(() => spy.callCount === 2)
    })

    it('does not emit on remove if the content does not change', () => {
      const spy = sinon.spy()

      const supportedProtocols = ['protocol1', 'protocol2']
      const removedProtocols = ['protocol3']

      peerStore.on('change:protocols', spy)

      // set
      pb.set(peerId, supportedProtocols)

      // remove
      pb.remove(peerId, removedProtocols)

      // Only one event
      expect(spy.callCount).to.eql(1)
    })
  })

  describe('protoBook.get', () => {
    let peerStore, pb

    beforeEach(() => {
      peerStore = new PeerStore({ peerId })
      pb = peerStore.protoBook
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        pb.get('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('returns undefined if no protocols are known for the provided peer', () => {
      const protocols = pb.get(peerId)

      expect(protocols).to.not.exist()
    })

    it('returns the protocols stored', () => {
      const supportedProtocols = ['protocol1', 'protocol2']

      pb.set(peerId, supportedProtocols)

      const protocols = pb.get(peerId)
      expect(protocols).to.have.deep.members(supportedProtocols)
    })
  })

  describe('protoBook.delete', () => {
    let peerStore, pb

    beforeEach(() => {
      peerStore = new PeerStore({ peerId })
      pb = peerStore.protoBook
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        pb.delete('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('returns false if no records exist for the peer and no event is emitted', () => {
      const defer = pDefer()

      peerStore.on('change:protocols', () => {
        defer.reject()
      })

      const deleted = pb.delete(peerId)

      expect(deleted).to.equal(false)

      // Wait 50ms for incorrect invalid event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })

    it('returns true if the record exists and an event is emitted', () => {
      const defer = pDefer()

      const supportedProtocols = ['protocol1', 'protocol2']
      pb.set(peerId, supportedProtocols)

      // Listen after set
      peerStore.on('change:protocols', ({ protocols }) => {
        expect(protocols.length).to.eql(0)
        defer.resolve()
      })

      const deleted = pb.delete(peerId)

      expect(deleted).to.equal(true)

      return defer.promise
    })
  })
})
