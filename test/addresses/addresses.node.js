'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')

const isLoopback = require('libp2p-utils/src/multiaddr/is-loopback')

const { AddressesOptions } = require('./utils')
const peerUtils = require('../utils/creators/peer')

const listenAddresses = ['/ip4/127.0.0.1/tcp/0', '/ip4/127.0.0.1/tcp/8000/ws']
const announceAddreses = ['/dns4/peer.io/tcp/433/p2p/12D3KooWNvSZnPi3RrhrTwEY4LuuBeB6K6facKUCJcyWG1aoDd2p']

describe('libp2p.multiaddrs', () => {
  let libp2p

  afterEach(() => libp2p && libp2p.stop())

  it('should keep listen addresses after start, even if changed', async () => {
    [libp2p] = await peerUtils.createPeer({
      started: false,
      config: {
        ...AddressesOptions,
        addresses: {
          listen: listenAddresses,
          announce: announceAddreses
        }
      }
    })

    let listenAddrs = libp2p.addressManager.listen
    expect(listenAddrs.size).to.equal(listenAddresses.length)
    expect(listenAddrs.has(listenAddresses[0])).to.equal(true)
    expect(listenAddrs.has(listenAddresses[1])).to.equal(true)

    // Should not replace listen addresses after transport listen
    // Only transportManager has visibility of the port used
    await libp2p.start()

    listenAddrs = libp2p.addressManager.listen
    expect(listenAddrs.size).to.equal(listenAddresses.length)
    expect(listenAddrs.has(listenAddresses[0])).to.equal(true)
    expect(listenAddrs.has(listenAddresses[1])).to.equal(true)
  })

  it('should advertise all addresses if noAnnounce addresses are not provided, but with correct ports', async () => {
    [libp2p] = await peerUtils.createPeer({
      config: {
        ...AddressesOptions,
        addresses: {
          listen: listenAddresses,
          announce: announceAddreses
        }
      }
    })

    const tmListen = libp2p.transportManager.getAddrs().map((ma) => ma.toString())

    const spyAnnounce = sinon.spy(libp2p.addressManager, 'getAnnounceAddrs')
    const spyNoAnnounce = sinon.spy(libp2p.addressManager, 'getNoAnnounceAddrs')
    const spyListen = sinon.spy(libp2p.addressManager, 'getListenAddrs')
    const spyTranspMgr = sinon.spy(libp2p.transportManager, 'getAddrs')

    const advertiseMultiaddrs = libp2p.multiaddrs.map((ma) => ma.toString())

    expect(spyAnnounce).to.have.property('callCount', 1)
    expect(spyNoAnnounce).to.have.property('callCount', 1)
    expect(spyListen).to.have.property('callCount', 0) // Listen addr should not be used
    expect(spyTranspMgr).to.have.property('callCount', 1)

    // Announce 2 listen (transport) + 1 announce
    expect(advertiseMultiaddrs.length).to.equal(3)
    tmListen.forEach((m) => {
      expect(advertiseMultiaddrs).to.include(m)
    })
    announceAddreses.forEach((m) => {
      expect(advertiseMultiaddrs).to.include(m)
    })
    expect(advertiseMultiaddrs).to.not.include(listenAddresses[0]) // Random Port switch
  })

  it('should remove replicated addresses', async () => {
    [libp2p] = await peerUtils.createPeer({
      config: {
        ...AddressesOptions,
        addresses: {
          listen: listenAddresses,
          announce: [listenAddresses[1]]
        }
      }
    })

    const advertiseMultiaddrs = libp2p.multiaddrs.map((ma) => ma.toString())

    // Announce 2 listen (transport), ignoring duplicated in announce
    expect(advertiseMultiaddrs.length).to.equal(2)
  })

  it('should not advertise noAnnounce addresses', async () => {
    const noAnnounce = [listenAddresses[1]]
    ;[libp2p] = await peerUtils.createPeer({
      config: {
        ...AddressesOptions,
        addresses: {
          listen: listenAddresses,
          announce: announceAddreses,
          noAnnounce
        }
      }
    })

    const advertiseMultiaddrs = libp2p.multiaddrs.map((ma) => ma.toString())

    // Announce 1 listen (transport) not in the noAnnounce and the announce
    expect(advertiseMultiaddrs.length).to.equal(2)

    announceAddreses.forEach((m) => {
      expect(advertiseMultiaddrs).to.include(m)
    })
    noAnnounce.forEach((m) => {
      expect(advertiseMultiaddrs).to.not.include(m)
    })
  })

  it('can filter out loopback addresses to announced by the announce filter', async () => {
    [libp2p] = await peerUtils.createPeer({
      started: false,
      config: {
        ...AddressesOptions,
        addresses: {
          listen: listenAddresses,
          announce: announceAddreses,
          announceFilter: (multiaddrs) => multiaddrs.filter(m => !isLoopback(m))
        }
      }
    })

    const listenAddrs = libp2p.addressManager.listen
    expect(listenAddrs.size).to.equal(listenAddresses.length)
    expect(listenAddrs.has(listenAddresses[0])).to.equal(true)
    expect(listenAddrs.has(listenAddresses[1])).to.equal(true)

    await libp2p.start()

    const multiaddrs = libp2p.multiaddrs
    expect(multiaddrs.length).to.equal(announceAddreses.length)
    expect(multiaddrs.includes(listenAddresses[0])).to.equal(false)
    expect(multiaddrs.includes(listenAddresses[1])).to.equal(false)
  })
})
