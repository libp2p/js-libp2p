'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')
const defer = require('p-defer')

const Libp2p = require('../../src')
const baseOptions = require('../utils/base-options.browser')
const { createPeerInfo } = require('../utils/creators/peer')

describe('peer discovery', () => {
  let peerInfo
  let remotePeerInfo
  let libp2p

  before(async () => {
    [peerInfo, remotePeerInfo] = await createPeerInfo(2)
  })

  afterEach(async () => {
    libp2p && await libp2p.stop()
  })

  it('should dial know peers on startup', async () => {
    libp2p = new Libp2p({
      ...baseOptions,
      peerInfo
    })
    libp2p.peerStore.add(remotePeerInfo)
    const deferred = defer()
    sinon.stub(libp2p.dialer, 'connectToPeer').callsFake((remotePeerInfo) => {
      expect(remotePeerInfo).to.equal(remotePeerInfo)
      deferred.resolve()
    })
    const spy = sinon.spy()
    libp2p.on('peer:discovery', spy)

    libp2p.start()
    await deferred.promise
    expect(spy.getCall(0).args).to.eql([remotePeerInfo])
  })
})
