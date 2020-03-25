'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')

const { EventEmitter } = require('events')
const pDefer = require('p-defer')

const PeerId = require('peer-id')

const ProtoBook = require('../../src/peer-store/proto-book')

const {
  ERR_INVALID_PARAMETERS
} = require('../../src/errors')

const arraysAreEqual = (a, b) => a.length === b.length && a.sort().every((item, index) => b[index] === item)

describe('protoBook', () => {
  describe('protoBook.set', () => {
    let peerId
    let ee, pb

    before(async () => {
      peerId = await PeerId.create()
    })

    beforeEach(() => {
      ee = new EventEmitter()
      pb = new ProtoBook(ee)
    })

    afterEach(() => {
      ee.removeAllListeners()
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
      sinon.spy(pb, '_replace')
      sinon.spy(pb, '_add')

      const supportedProtocols = ['protocol1', 'protocol2']

      ee.once('change:protocols', ({ peerId, protocols }) => {
        expect(peerId).to.exist()
        expect(protocols).to.have.deep.members(supportedProtocols)
        defer.resolve()
      })

      const protocols = pb.set(peerId, supportedProtocols)

      expect(pb._replace.callCount).to.equal(1)
      expect(pb._add.callCount).to.equal(0)
      expect(protocols).to.have.deep.members(supportedProtocols)

      return defer.promise
    })

    it('adds the new content if replace is disabled and emit change event', () => {
      const defer = pDefer()
      sinon.spy(pb, '_replace')
      sinon.spy(pb, '_add')

      const supportedProtocolsA = ['protocol1', 'protocol2']
      const supportedProtocolsB = ['protocol3']
      const finalProtocols = supportedProtocolsA.concat(supportedProtocolsB)

      let changeTrigger = 2
      ee.on('change:protocols', ({ protocols }) => {
        changeTrigger--
        if (changeTrigger === 0 && arraysAreEqual(protocols, finalProtocols)) {
          defer.resolve()
        }
      })

      // Replace
      let protocols = pb.set(peerId, supportedProtocolsA)
      expect(pb._replace.callCount).to.equal(1)
      expect(pb._add.callCount).to.equal(0)
      expect(protocols).to.have.deep.members(supportedProtocolsA)

      // Add
      protocols = pb.set(peerId, supportedProtocolsB, { replace: false })
      expect(pb._replace.callCount).to.equal(1)
      expect(pb._add.callCount).to.equal(1)
      expect(protocols).to.have.deep.members(finalProtocols)

      return defer.promise
    })

    it('emits on set (replace) if not storing the exact same content', () => {
      const defer = pDefer()

      const supportedProtocolsA = ['protocol1', 'protocol2']
      const supportedProtocolsB = ['protocol2']

      let changeCounter = 0
      ee.on('change:protocols', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.resolve()
        }
      })

      // set 1
      pb.set(peerId, supportedProtocolsA)

      // set 2 (same content)
      const protocols = pb.set(peerId, supportedProtocolsB)
      expect(protocols).to.have.deep.members(supportedProtocolsB)

      return defer.promise
    })

    it('does not emit on set (replace) if it is storing the exact same content', () => {
      const defer = pDefer()

      const supportedProtocols = ['protocol1', 'protocol2']

      let changeCounter = 0
      ee.on('change:protocols', () => {
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

    it('emits on set (add) if the content to add not exists', () => {
      const defer = pDefer()

      const supportedProtocolsA = ['protocol1']
      const supportedProtocolsB = ['protocol2']
      const finalProtocols = supportedProtocolsA.concat(supportedProtocolsB)

      let changeCounter = 0
      ee.on('change:protocols', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.resolve()
        }
      })

      // set 1
      pb.set(peerId, supportedProtocolsA)

      // set 2 (content already existing)
      const protocols = pb.set(peerId, supportedProtocolsB, { replace: false })
      expect(protocols).to.have.deep.members(finalProtocols)

      return defer.promise
    })

    it('does not emit on set (merge) if the content to add already exists', () => {
      const defer = pDefer()

      const supportedProtocolsA = ['protocol1', 'protocol2']
      const supportedProtocolsB = ['protocol2']

      let changeCounter = 0
      ee.on('change:protocols', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.reject()
        }
      })

      // set 1
      pb.set(peerId, supportedProtocolsA)

      // set 2 (content already existing)
      pb.set(peerId, supportedProtocolsB, { replace: false })

      // Wait 50ms for incorrect second event
      setTimeout(() => {
        defer.resolve()
      }, 50)

      return defer.promise
    })
  })

  describe('protoBook.get', () => {
    let peerId
    let ee, pb

    before(async () => {
      peerId = await PeerId.create()
    })

    beforeEach(() => {
      ee = new EventEmitter()
      pb = new ProtoBook(ee)
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

  describe('protoBook.supports', () => {
    let peerId
    let ee, pb

    before(async () => {
      peerId = await PeerId.create()
    })

    beforeEach(() => {
      ee = new EventEmitter()
      pb = new ProtoBook(ee)
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        pb.supports('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('throwns invalid parameters error if no protocols provided', () => {
      expect(() => {
        pb.supports(peerId)
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('returns false if no records exist for the peer', () => {
      const supportedProtocols = ['protocol1']
      const supports = pb.supports(peerId, supportedProtocols[0])

      expect(supports).to.equal(false)
    })

    it('returns true if the protocol is supported', () => {
      const supportedProtocols = ['protocol1', 'protocol2']

      pb.set(peerId, supportedProtocols)

      const supports = pb.supports(peerId, supportedProtocols[1])
      expect(supports).to.equal(true)
    })

    it('returns false if part of the protocols is supported', () => {
      const supportedProtocols = ['protocol1', 'protocol2']
      const otherProtocols = ['protocol3', 'protocol4']

      pb.set(peerId, supportedProtocols)

      const supports = pb.supports(peerId, [supportedProtocols[0], ...otherProtocols])
      expect(supports).to.equal(false)
    })
  })

  describe('protoBook.delete', () => {
    let peerId
    let ee, pb

    before(async () => {
      peerId = await PeerId.create()
    })

    beforeEach(() => {
      ee = new EventEmitter()
      pb = new ProtoBook(ee)
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        pb.delete('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('returns false if no records exist for the peer and no event is emitted', () => {
      const defer = pDefer()

      ee.on('change:protocols', () => {
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
      ee.on('change:protocols', ({ protocols }) => {
        expect(protocols.length).to.eql(0)
        defer.resolve()
      })

      const deleted = pb.delete(peerId)

      expect(deleted).to.equal(true)

      return defer.promise
    })
  })
})
