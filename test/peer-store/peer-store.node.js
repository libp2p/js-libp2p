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

describe('peer-store on dial', () => {
  let peerInfo
  let remotePeerInfo
  let libp2p
  let remoteLibp2p
  let remoteAddr

  before(async () => {
    [peerInfo, remotePeerInfo] = await peerUtils.createPeerInfoFromFixture(2)
    remoteLibp2p = new Libp2p(mergeOptions(baseOptions, {
      peerInfo: remotePeerInfo
    }))

    await remoteLibp2p.transportManager.listen([listenAddr])
    remoteAddr = remoteLibp2p.transportManager.getAddrs()[0]
  })

  after(async () => {
    sinon.restore()
    await remoteLibp2p.stop()
    libp2p && await libp2p.stop()
  })

  it('should put the remote peerInfo after dial and emit event', async () => {
    // TODO: needs crypto PR fix
    // const remoteId = remotePeerInfo.id.toB58String()
    const remoteId = peerInfo.id.toB58String()

    libp2p = new Libp2p(mergeOptions(baseOptions, {
      peerInfo
    }))

    sinon.spy(libp2p.peerStore, 'put')
    sinon.spy(libp2p.peerStore, 'add')
    sinon.spy(libp2p.peerStore, 'update')

    const connection = await libp2p.dial(remoteAddr)
    await connection.close()

    expect(libp2p.peerStore.put.callCount).to.equal(1)
    expect(libp2p.peerStore.add.callCount).to.equal(1)
    expect(libp2p.peerStore.update.callCount).to.equal(0)

    const storedPeer = libp2p.peerStore.get(remoteId)
    expect(storedPeer).to.exist()
  })
})

describe('peer-store on discovery', () => {
  // TODO: implement with discovery
})
