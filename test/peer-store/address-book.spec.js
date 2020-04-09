'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const { EventEmitter } = require('events')
const pDefer = require('p-defer')
const multiaddr = require('multiaddr')

const AddressBook = require('../../src/peer-store/address-book')

const peerUtils = require('../utils/creators/peer')
const {
  ERR_INVALID_PARAMETERS
} = require('../../src/errors')

const addr1 = multiaddr('/ip4/127.0.0.1/tcp/8000')
const addr2 = multiaddr('/ip4/127.0.0.1/tcp/8001')
const addr3 = multiaddr('/ip4/127.0.0.1/tcp/8002')

const arraysAreEqual = (a, b) => a.length === b.length && a.sort().every((item, index) => b[index] === item)

describe('addressBook', () => {
  let peerId

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
  })

  describe('addressBook.set', () => {
    let ee, ab

    beforeEach(() => {
      ee = new EventEmitter()
      ab = new AddressBook(ee)
    })

    afterEach(() => {
      ee.removeAllListeners()
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        ab.set('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('throwns invalid parameters error if no addresses provided', () => {
      expect(() => {
        ab.set(peerId)
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('throwns invalid parameters error if invalid multiaddrs are provided', () => {
      expect(() => {
        ab.set(peerId, 'invalid multiaddr')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('replaces the stored content by default and emit change event', () => {
      const defer = pDefer()
      const supportedMultiaddrs = [addr1, addr2]

      ee.once('change:multiaddrs', ({ peerId, multiaddrs }) => {
        expect(peerId).to.exist()
        expect(multiaddrs).to.eql(supportedMultiaddrs)
        defer.resolve()
      })

      ab.set(peerId, supportedMultiaddrs)
      const multiaddrInfos = ab.get(peerId)
      const multiaddrs = multiaddrInfos.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(supportedMultiaddrs)

      return defer.promise
    })

    it('emits on set if not storing the exact same content', async () => {
      const defer = pDefer()

      const supportedMultiaddrsA = [addr1, addr2]
      const supportedMultiaddrsB = [addr2]

      let changeCounter = 0
      ee.on('change:multiaddrs', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.resolve()
        }
      })

      // set 1
      ab.set(peerId, supportedMultiaddrsA)

      // set 2 (same content)
      ab.set(peerId, supportedMultiaddrsB)
      const multiaddrInfos = ab.get(peerId)
      const multiaddrs = multiaddrInfos.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(supportedMultiaddrsB)

      await defer.promise
    })

    it('does not emit on set if it is storing the exact same content', async () => {
      const defer = pDefer()

      const supportedMultiaddrs = [addr1, addr2]

      let changeCounter = 0
      ee.on('change:multiaddrs', () => {
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
    let ee, ab

    beforeEach(() => {
      ee = new EventEmitter()
      ab = new AddressBook(ee)
    })

    afterEach(() => {
      ee.removeAllListeners()
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        ab.add('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('throwns invalid parameters error if no addresses provided', () => {
      expect(() => {
        ab.add(peerId)
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('throwns invalid parameters error if invalid multiaddrs are provided', () => {
      expect(() => {
        ab.add(peerId, 'invalid multiaddr')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('adds the new content and emits change event', () => {
      const defer = pDefer()

      const supportedMultiaddrsA = [addr1, addr2]
      const supportedMultiaddrsB = [addr3]
      const finalMultiaddrs = supportedMultiaddrsA.concat(supportedMultiaddrsB)

      let changeTrigger = 2
      ee.on('change:multiaddrs', ({ multiaddrs }) => {
        changeTrigger--
        if (changeTrigger === 0 && arraysAreEqual(multiaddrs, finalMultiaddrs)) {
          defer.resolve()
        }
      })

      // Replace
      ab.set(peerId, supportedMultiaddrsA)
      let multiaddrInfos = ab.get(peerId)
      let multiaddrs = multiaddrInfos.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(supportedMultiaddrsA)

      // Add
      ab.add(peerId, supportedMultiaddrsB)
      multiaddrInfos = ab.get(peerId)
      multiaddrs = multiaddrInfos.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(finalMultiaddrs)

      return defer.promise
    })

    it('emits on add if the content to add not exists', async () => {
      const defer = pDefer()

      const supportedMultiaddrsA = [addr1]
      const supportedMultiaddrsB = [addr2]
      const finalMultiaddrs = supportedMultiaddrsA.concat(supportedMultiaddrsB)

      let changeCounter = 0
      ee.on('change:multiaddrs', () => {
        changeCounter++
        if (changeCounter > 1) {
          defer.resolve()
        }
      })

      // set 1
      ab.set(peerId, supportedMultiaddrsA)

      // set 2 (content already existing)
      ab.add(peerId, supportedMultiaddrsB)
      const multiaddrInfos = ab.get(peerId)
      const multiaddrs = multiaddrInfos.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(finalMultiaddrs)

      await defer.promise
    })

    it('does not emit on add if the content to add already exists', async () => {
      const defer = pDefer()

      const supportedMultiaddrsA = [addr1, addr2]
      const supportedMultiaddrsB = [addr2]

      let changeCounter = 0
      ee.on('change:multiaddrs', () => {
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
    let ee, ab

    beforeEach(() => {
      ee = new EventEmitter()
      ab = new AddressBook(ee)
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        ab.get('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('returns undefined if no multiaddrs are known for the provided peer', () => {
      const multiaddrInfos = ab.get(peerId)

      expect(multiaddrInfos).to.not.exist()
    })

    it('returns the multiaddrs stored', () => {
      const supportedMultiaddrs = [addr1, addr2]

      ab.set(peerId, supportedMultiaddrs)

      const multiaddrInfos = ab.get(peerId)
      const multiaddrs = multiaddrInfos.map((mi) => mi.multiaddr)
      expect(multiaddrs).to.have.deep.members(supportedMultiaddrs)
    })
  })

  describe('addressBook.getMultiaddrsForPeer', () => {
    let ee, ab

    beforeEach(() => {
      ee = new EventEmitter()
      ab = new AddressBook(ee)
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        ab.getMultiaddrsForPeer('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('returns undefined if no multiaddrs are known for the provided peer', () => {
      const multiaddrInfos = ab.getMultiaddrsForPeer(peerId)

      expect(multiaddrInfos).to.not.exist()
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
    let ee, ab

    beforeEach(() => {
      ee = new EventEmitter()
      ab = new AddressBook(ee)
    })

    it('throwns invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        ab.delete('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('returns false if no records exist for the peer and no event is emitted', () => {
      const defer = pDefer()

      ee.on('change:multiaddrs', () => {
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
      ee.on('change:multiaddrs', ({ multiaddrs }) => {
        expect(multiaddrs.length).to.eql(0)
        defer.resolve()
      })

      const deleted = ab.delete(peerId)

      expect(deleted).to.equal(true)

      return defer.promise
    })
  })
})
