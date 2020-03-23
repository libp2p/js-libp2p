'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')

const { EventEmitter } = require('events')

const PeerId = require('peer-id')

const ProtoBook = require('../../src/peer-store/proto-book')

const {
  ERR_INVALID_PARAMETERS
} = require('../../src/errors')

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

    it('should thrown invalid parameters error if invalid PeerId is provided', () => {
      expect(() => {
        pb.set('invalid peerId')
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('should thrown invalid parameters error if no protocols provided', () => {
      expect(() => {
        pb.set(peerId)
      }).to.throw(ERR_INVALID_PARAMETERS)
    })

    it('should replace the stored content by default', () => {
      sinon.spy(pb, '_replace')
      sinon.spy(pb, '_add')

      const supportedProtocols = ['protocol1', 'protocol2']
      const protocols = pb.set(peerId, supportedProtocols)

      expect(pb._replace.callCount).to.equal(1)
      expect(pb._add.callCount).to.equal(0)
      expect(protocols).to.eql(supportedProtocols)
    })

    it('should replace the stored content by default', () => {
      sinon.spy(pb, '_replace')
      sinon.spy(pb, '_add')

      const supportedProtocols = ['protocol1', 'protocol2']
      const protocols = pb.set(peerId, supportedProtocols)

      expect(pb._replace.callCount).to.equal(1)
      expect(pb._add.callCount).to.equal(0)
      expect(protocols).to.eql(supportedProtocols)
    })
  })
})
