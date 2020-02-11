'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')

const pDefer = require('p-defer')

const PeerStore = require('../../src/peer-store')
const multiaddr = require('multiaddr')
const peerUtils = require('../utils/creators/peer')

const addr = multiaddr('/ip4/127.0.0.1/tcp/8000')

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

    const [peerInfo] = await peerUtils.createPeerInfo()

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
    const [peerInfo] = await peerUtils.createPeerInfo()

    // Put the peer in the store
    peerStore.put(peerInfo)

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

    expect(peerStore.add.callCount).to.equal(0)
    expect(peerStore.update.callCount).to.equal(1)
  })

  it('should emit the "change:multiaddrs" event when a peer has new multiaddrs', async () => {
    const defer = pDefer()
    const [createdPeerInfo] = await peerUtils.createPeerInfo()

    // Put the peer in the store
    peerStore.put(createdPeerInfo)

    // When updating, "change:multiaddrs" event must not be emitted
    peerStore.on('change:multiaddrs', ({ peerInfo, multiaddrs }) => {
      expect(peerInfo).to.exist()
      expect(peerInfo.id).to.eql(createdPeerInfo.id)
      expect(peerInfo.protocols).to.eql(createdPeerInfo.protocols)
      expect(multiaddrs).to.exist()
      expect(multiaddrs).to.eql(createdPeerInfo.multiaddrs.toArray())
      defer.resolve()
    })
    // If no protocols change, the event should not be emitted
    peerStore.on('change:protocols', () => {
      throw new Error('should not emit change:protocols')
    })

    createdPeerInfo.multiaddrs.add(addr)
    peerStore.put(createdPeerInfo)

    // Wait for peerStore to emit the event
    await defer.promise
  })

  it('should emit the "change:protocols" event when a peer has new protocols', async () => {
    const defer = pDefer()
    const [createdPeerInfo] = await peerUtils.createPeerInfo()

    // Put the peer in the store
    peerStore.put(createdPeerInfo)

    // If no multiaddrs change, the event should not be emitted
    peerStore.on('change:multiaddrs', () => {
      throw new Error('should not emit change:multiaddrs')
    })
    // When updating, "change:protocols" event must be emitted
    peerStore.on('change:protocols', ({ peerInfo, protocols }) => {
      expect(peerInfo).to.exist()
      expect(peerInfo.id).to.eql(createdPeerInfo.id)
      expect(peerInfo.multiaddrs).to.eql(createdPeerInfo.multiaddrs)
      expect(protocols).to.exist()
      expect(protocols).to.eql(Array.from(createdPeerInfo.protocols))
      defer.resolve()
    })

    createdPeerInfo.protocols.add('/new-protocol/1.0.0')
    peerStore.put(createdPeerInfo)

    // Wait for peerStore to emit the event
    await defer.promise
  })

  it('should be able to retrieve a peer from store through its b58str id', async () => {
    const [peerInfo] = await peerUtils.createPeerInfo()
    const id = peerInfo.id

    let retrievedPeer = peerStore.get(id)
    expect(retrievedPeer).to.not.exist()

    // Put the peer in the store
    peerStore.put(peerInfo)

    retrievedPeer = peerStore.get(id)
    expect(retrievedPeer).to.exist()
    expect(retrievedPeer.id).to.equal(peerInfo.id)
    expect(retrievedPeer.multiaddrs).to.eql(peerInfo.multiaddrs)
    expect(retrievedPeer.protocols).to.eql(peerInfo.protocols)
  })

  it('should be able to remove a peer from store through its b58str id', async () => {
    const [peerInfo] = await peerUtils.createPeerInfo()
    const id = peerInfo.id

    let removed = peerStore.remove(id)
    expect(removed).to.eql(false)

    // Put the peer in the store
    peerStore.put(peerInfo)
    expect(peerStore.peers.size).to.equal(1)

    removed = peerStore.remove(id)
    expect(removed).to.eql(true)
    expect(peerStore.peers.size).to.equal(0)
  })

  it('should be able to remove a peer from store through its b58str id', async () => {
    const [peerInfo] = await peerUtils.createPeerInfo()
    const id = peerInfo.id
    const ma1 = multiaddr('/ip4/127.0.0.1/tcp/4001')
    const ma2 = multiaddr('/ip4/127.0.0.1/tcp/4002/ws')

    peerInfo.multiaddrs.add(ma1)
    peerInfo.multiaddrs.add(ma2)

    const multiaddrs = peerStore.multiaddrsForPeer(peerInfo)
    const expectedAddrs = [
      ma1.encapsulate(`/p2p/${id.toB58String()}`),
      ma2.encapsulate(`/p2p/${id.toB58String()}`)
    ]

    expect(multiaddrs).to.eql(expectedAddrs)
  })
})

describe('peer-store on discovery', () => {
  // TODO: implement with discovery
})
