'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')

const mergeOptions = require('merge-options')

const multiaddr = require('multiaddr')
const Libp2p = require('../../src')

const baseOptions = require('../utils/base-options')
const peerUtils = require('../utils/creators/peer')
const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')

describe('registrar on dial', () => {
  let peerInfo
  let remotePeerInfo
  let libp2p
  let remoteLibp2p
  let remoteAddr

  before(async () => {
    [peerInfo, remotePeerInfo] = await peerUtils.createPeerInfo({ number: 2 })
    remoteLibp2p = new Libp2p(mergeOptions(baseOptions, {
      peerInfo: remotePeerInfo
    }))

    await remoteLibp2p.transportManager.listen([listenAddr])
    remoteAddr = remoteLibp2p.transportManager.getAddrs()[0].encapsulate(`/p2p/${remotePeerInfo.id.toB58String()}`)
  })

  after(async () => {
    sinon.restore()
    await remoteLibp2p.stop()
    libp2p && await libp2p.stop()
  })

  it('should inform registrar of a new connection', async () => {
    libp2p = new Libp2p(mergeOptions(baseOptions, {
      peerInfo
    }))

    sinon.spy(remoteLibp2p.registrar, 'onConnect')

    await libp2p.dial(remoteAddr)
    expect(remoteLibp2p.registrar.onConnect.callCount).to.equal(1)

    const libp2pConn = libp2p.registrar.getConnection(remotePeerInfo)
    expect(libp2pConn).to.exist()

    const remoteConn = remoteLibp2p.registrar.getConnection(peerInfo)
    expect(remoteConn).to.exist()
  })

  it('should be closed on libp2p stop', async () => {
    libp2p = new Libp2p(mergeOptions(baseOptions, {
      peerInfo
    }))

    await libp2p.dial(remoteAddr)
    expect(libp2p.connections.size).to.equal(1)

    sinon.spy(libp2p.registrar, 'close')

    await libp2p.stop()
    expect(libp2p.registrar.close.callCount).to.equal(1)
    expect(libp2p.connections.size).to.equal(0)
  })
})
