'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const multiaddr = require('multiaddr')
const PeerId = require('peer-id')

const AddressManager = require('../../src/address-manager')
const peerUtils = require('../utils/creators/peer')

const Peers = require('../fixtures/peers')

const listenAddresses = ['/ip4/127.0.0.1/tcp/15006/ws', '/ip4/127.0.0.1/tcp/15008/ws']
const announceAddreses = ['/dns4/peer.io']

describe('Address Manager', () => {
  let peerId
  let peerIds

  before(async () => {
    peerId = await PeerId.createFromJSON(Peers[0])
    peerIds = await Promise.all(Peers.slice(1).map(peerId => PeerId.createFromJSON(peerId)))
  })

  it('should not need any addresses', () => {
    const am = new AddressManager(peerId)

    expect(am.listen.size).to.equal(0)
    expect(am.announce.size).to.equal(0)
  })

  it('should return listen multiaddrs on get', () => {
    const am = new AddressManager(peerId, {
      listen: listenAddresses
    })

    expect(am.listen.size).to.equal(listenAddresses.length)
    expect(am.announce.size).to.equal(0)

    const listenMultiaddrs = am.getListenAddrs()
    expect(listenMultiaddrs.length).to.equal(2)
    expect(listenMultiaddrs[0].equals(multiaddr(listenAddresses[0]))).to.equal(true)
    expect(listenMultiaddrs[1].equals(multiaddr(listenAddresses[1]))).to.equal(true)
  })

  it('should return announce multiaddrs on get', () => {
    const am = new AddressManager(peerId, {
      listen: listenAddresses,
      announce: announceAddreses
    })

    expect(am.listen.size).to.equal(listenAddresses.length)
    expect(am.announce.size).to.equal(announceAddreses.length)

    const announceMultiaddrs = am.getAnnounceAddrs()
    expect(announceMultiaddrs.length).to.equal(1)
    expect(announceMultiaddrs[0].equals(multiaddr(announceAddreses[0]))).to.equal(true)
  })

  it('should add observed addresses', () => {
    const am = new AddressManager(peerId)

    expect(am.observed).to.be.empty()

    am.addObservedAddr('/ip4/123.123.123.123/tcp/39201', peerId)

    expect(am.observed).to.have.property('size', 1)
  })

  it('should dedupe added observed addresses', () => {
    const ma = '/ip4/123.123.123.123/tcp/39201'
    const am = new AddressManager(peerId)

    expect(am.observed).to.be.empty()

    am.addObservedAddr(ma, peerId)
    am.addObservedAddr(ma, peerId)
    am.addObservedAddr(ma, peerId)

    expect(am.observed).to.have.property('size', 1)
    expect(Array.from(am.observed.keys())).to.include(ma)
  })

  it('should only emit one change:addresses event', () => {
    const ma = '/ip4/123.123.123.123/tcp/39201'
    const am = new AddressManager(peerId)
    let eventCount = 0

    am.on('change:addresses', () => {
      eventCount++
    })

    am.addObservedAddr(ma, peerIds[0])
    am.addObservedAddr(ma, peerIds[1])
    am.addObservedAddr(ma, peerIds[2])
    am.addObservedAddr(`${ma}/p2p/${peerId}`, peerIds[3])
    am.addObservedAddr(`${ma}/p2p/${peerId.toB58String()}`, peerIds[4])

    expect(eventCount).to.equal(1)
  })

  it('should emit one change:addresses event when specifying confidence', () => {
    const ma = '/ip4/123.123.123.123/tcp/39201'
    const am = new AddressManager(peerId)
    let eventCount = 0

    am.on('change:addresses', () => {
      eventCount++
    })

    am.addObservedAddr(ma, peerId, am.config.observedAddresses.minConfidence)

    expect(eventCount).to.equal(1)
  })

  it('should strip our peer address from added observed addresses', () => {
    const ma = '/ip4/123.123.123.123/tcp/39201'
    const am = new AddressManager(peerId)

    expect(am.observed).to.be.empty()

    am.addObservedAddr(ma, peerId)
    am.addObservedAddr(`${ma}/p2p/${peerId}`, peerId)

    expect(am.observed).to.have.property('size', 1)

    expect(Array.from(am.observed.keys())).to.include(ma)
  })

  it('should strip our peer address from added observed addresses in difference formats', () => {
    const ma = '/ip4/123.123.123.123/tcp/39201'
    const am = new AddressManager(peerId)

    expect(am.observed).to.be.empty()

    am.addObservedAddr(ma, peerId)
    am.addObservedAddr(`${ma}/p2p/${peerId}`, peerId) // base32 CID
    am.addObservedAddr(`${ma}/p2p/${peerId.toB58String()}`, peerId) // base58btc

    expect(am.observed).to.have.property('size', 1)

    expect(Array.from(am.observed.keys())).to.include(ma)
  })

  it('should require a number of confirmations before believing address', () => {
    const ma = '/ip4/123.123.123.123/tcp/39201'
    const am = new AddressManager(peerId)

    expect(am.observed).to.be.empty()

    am.addObservedAddr(ma, peerId)

    expect(am.getObservedAddrs().map(ma => ma.toString())).to.not.include(ma)

    for (let i = 0; i < am.config.observedAddresses.minConfidence; i++) {
      am.addObservedAddr(ma, peerIds[i])
    }

    expect(am.getObservedAddrs().map(ma => ma.toString())).to.include(ma)
  })

  it('should require a number of confirmations from different peers', () => {
    const ma = '/ip4/123.123.123.123/tcp/39201'
    const am = new AddressManager(peerId)

    expect(am.observed).to.be.empty()

    am.addObservedAddr(ma, peerId)

    expect(am.getObservedAddrs().map(ma => ma.toString())).to.not.include(ma)

    for (let i = 0; i < am.config.observedAddresses.minConfidence; i++) {
      am.addObservedAddr(ma, peerIds[0])
    }

    expect(am.getObservedAddrs().map(ma => ma.toString())).to.not.include(ma)
  })

  it('should evict addresses that do not receive enough confirmations within the timeout', () => {
    const ma1 = '/ip4/123.123.123.123/tcp/39201'
    const ma2 = '/ip4/124.124.124.124/tcp/39202'
    const am = new AddressManager(peerId)

    expect(am.observed).to.be.empty()

    am.addObservedAddr(ma1, peerId)

    const observedAddrs = Array.from(am.observed.values())

    expect(Array.from(am.observed.keys())).to.include(ma1)

    // make expiry date a while ago
    observedAddrs[0].expires = Date.now() - 1000

    // will evict any old multiaddrs
    am.addObservedAddr(ma2, peerId)

    // should have been evicted
    expect(Array.from(am.observed.keys())).to.not.include(ma1)
    expect(Array.from(am.observed.keys())).to.include(ma2)
  })
})

describe('libp2p.addressManager', () => {
  let libp2p
  afterEach(() => libp2p && libp2p.stop())

  it('should populate the AddressManager from the config', async () => {
    [libp2p] = await peerUtils.createPeer({
      started: false,
      config: {
        addresses: {
          listen: listenAddresses,
          announce: announceAddreses
        }
      }
    })

    expect(libp2p.addressManager.listen.size).to.equal(listenAddresses.length)
    expect(libp2p.addressManager.announce.size).to.equal(announceAddreses.length)
  })
})
