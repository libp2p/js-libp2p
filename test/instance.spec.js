/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-spies'))
const expect = chai.expect

const PubsubBaseProtocol = require('../src')
const { createPeerId, mockRegistrar } = require('./utils')

describe('should validate instance parameters', () => {
  let peerId

  before(async () => {
    peerId = await createPeerId()
  })

  it('should throw if no debugName is provided', () => {
    expect(() => {
      new PubsubBaseProtocol() // eslint-disable-line no-new
    }).to.throw()
  })

  it('should throw if no multicodec is provided', () => {
    expect(() => {
      new PubsubBaseProtocol({ // eslint-disable-line no-new
        debugName: 'pubsub'
      })
    }).to.throw()
  })

  it('should throw if no peerId is provided', () => {
    expect(() => {
      new PubsubBaseProtocol({ // eslint-disable-line no-new
        debugName: 'pubsub',
        multicodecs: '/pubsub/1.0.0'
      })
    }).to.throw()
  })

  it('should throw if an invalid peerId is provided', () => {
    expect(() => {
      new PubsubBaseProtocol({ // eslint-disable-line no-new
        debugName: 'pubsub',
        multicodecs: '/pubsub/1.0.0',
        peerId: 'fake-peer-id'
      })
    }).to.throw()
  })

  it('should throw if no registrar object is provided', () => {
    expect(() => {
      new PubsubBaseProtocol({ // eslint-disable-line no-new
        debugName: 'pubsub',
        multicodecs: '/pubsub/1.0.0',
        peerId: peerId
      })
    }).to.throw()
  })

  it('should accept valid parameters', () => {
    expect(() => {
      new PubsubBaseProtocol({ // eslint-disable-line no-new
        debugName: 'pubsub',
        multicodecs: '/pubsub/1.0.0',
        peerId: peerId,
        registrar: mockRegistrar
      })
    }).not.to.throw()
  })
})
