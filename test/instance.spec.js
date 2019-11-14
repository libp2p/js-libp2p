/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-spies'))
const expect = chai.expect

const PubsubBaseProtocol = require('../src')
const { createPeerInfo, mockRegistrar } = require('./utils')

describe('should validate instance parameters', () => {
  let peerInfo

  before(async () => {
    peerInfo = await createPeerInfo()
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

  it('should throw if no peerInfo is provided', () => {
    expect(() => {
      new PubsubBaseProtocol({ // eslint-disable-line no-new
        debugName: 'pubsub',
        multicodecs: '/pubsub/1.0.0'
      })
    }).to.throw()
  })

  it('should throw if an invalid peerInfo is provided', () => {
    expect(() => {
      new PubsubBaseProtocol({ // eslint-disable-line no-new
        debugName: 'pubsub',
        multicodecs: '/pubsub/1.0.0',
        peerInfo: 'fake-peer-info'
      })
    }).to.throw()
  })

  it('should throw if no registrar object is provided', () => {
    expect(() => {
      new PubsubBaseProtocol({ // eslint-disable-line no-new
        debugName: 'pubsub',
        multicodecs: '/pubsub/1.0.0',
        peerInfo: peerInfo
      })
    }).to.throw()
  })

  it('should accept valid parameters', () => {
    expect(() => {
      new PubsubBaseProtocol({ // eslint-disable-line no-new
        debugName: 'pubsub',
        multicodecs: '/pubsub/1.0.0',
        peerInfo: peerInfo,
        registrar: mockRegistrar
      })
    }).not.to.throw()
  })
})
