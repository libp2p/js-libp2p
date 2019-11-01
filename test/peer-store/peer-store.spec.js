'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')

const pDefer = require('p-defer')
const PeerStore = require('../../src/peer-store')
const multiaddr = require('multiaddr')

const addr = multiaddr('/ip4/127.0.0.1/tcp/8000')
const peerUtils = require('../utils/creators/peer')

describe('peer-store', () => {
  let peerStore

  beforeEach(() => {
    peerStore = new PeerStore()
  })

  it('should add a new peer and emit it when it does not exist', async () => {
    const defer = pDefer()

    sinon.spy(peerStore, 'put')
    sinon.spy(peerStore, 'add')
    sinon.spy(peerStore, 'update')

    const [peerInfo] = await peerUtils.createPeerInfo(1)

    peerStore.on('peer', (peer) => {
      expect(peer).to.exist()
      defer.resolve()
    })
    peerStore.put(peerInfo)

    // Wait for peerStore to emit the peer
    await defer.promise

    expect(peerStore.put.callCount).to.equal(1)
    expect(peerStore.add.callCount).to.equal(1)
    expect(peerStore.update.callCount).to.equal(0)
  })

  it('should update peer when it is already in the store', async () => {
    const [peerInfo] = await peerUtils.createPeerInfo(1)

    // Put the peer in the store
    peerStore.put(peerInfo)

    sinon.spy(peerStore, 'put')
    sinon.spy(peerStore, 'add')
    sinon.spy(peerStore, 'update')

    // When updating, peer event must not be emitted
    peerStore.on('peer', () => {
      throw new Error('should not emit twice')
    })
    // If no multiaddrs change, the event should not be emitted
    peerStore.on('change:multiaddrs', () => {
      throw new Error('should not emit change:multiaddrs')
    })
    // If no protocols change, the event should not be emitted
    peerStore.on('change:protocols', () => {
      throw new Error('should not emit change:protocols')
    })

    peerStore.put(peerInfo)

    expect(peerStore.put.callCount).to.equal(1)
    expect(peerStore.add.callCount).to.equal(0)
    expect(peerStore.update.callCount).to.equal(1)
  })

  it('should emit the "change:multiaddrs" event when a peer has new multiaddrs', async () => {
    const defer = pDefer()
    const [peerInfo] = await peerUtils.createPeerInfo(1)

    // Put the peer in the store
    peerStore.put(peerInfo)

    // When updating, "change:multiaddrs" event must not be emitted
    peerStore.on('change:multiaddrs', ({ peerInfo, multiaddrs }) => {
      expect(peerInfo).to.exist()
      expect(multiaddrs).to.exist()
      defer.resolve()
    })
    // If no protocols change, the event should not be emitted
    peerStore.on('change:protocols', () => {
      throw new Error('should not emit change:protocols')
    })

    peerInfo.multiaddrs.add(addr)
    peerStore.put(peerInfo)

    // Wait for peerStore to emit the event
    await defer.promise
  })

  it('should emit the "change:protocols" event when a peer has new protocols', async () => {
    const defer = pDefer()
    const [peerInfo] = await peerUtils.createPeerInfo(1)

    // Put the peer in the store
    peerStore.put(peerInfo)

    // If no multiaddrs change, the event should not be emitted
    peerStore.on('change:multiaddrs', () => {
      throw new Error('should not emit change:multiaddrs')
    })
    // When updating, "change:protocols" event must not be emitted
    peerStore.on('change:protocols', ({ peerInfo, protocols }) => {
      expect(peerInfo).to.exist()
      expect(protocols).to.exist()
      defer.resolve()
    })

    peerInfo.protocols.add('/new-protocol/1.0.0')
    peerStore.put(peerInfo)

    // Wait for peerStore to emit the event
    await defer.promise
  })

  it('should be able to retrieve a peer from store through its b58str id', async () => {
    const [peerInfo] = await peerUtils.createPeerInfo(1)
    const id = peerInfo.id.toB58String()

    try {
      peerStore.get(id)
      throw new Error('peer should not exist in store')
    } catch (err) {
      expect(err).to.exist()
      expect(err.code).to.eql('ERR_NO_PEER_INFO')
    }

    // Put the peer in the store
    peerStore.put(peerInfo)

    const retrievedPeer = peerStore.get(id)
    expect(retrievedPeer).to.exist()
  })

  it('should be able to remove a peer from store through its b58str id', async () => {
    const [peerInfo] = await peerUtils.createPeerInfo(1)
    const id = peerInfo.id.toB58String()

    let removed = peerStore.remove(id)
    expect(removed).to.eql(false)

    // Put the peer in the store
    peerStore.put(peerInfo)

    const peers = peerStore.getAllArray()
    expect(peers).to.have.lengthOf(1)

    removed = peerStore.remove(id)
    expect(removed).to.eql(true)
  })
})
