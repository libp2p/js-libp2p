'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')

const multiaddr = require('multiaddr')
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

  it('should announce transport listen addresses if announce addresses are not provided', async () => {
    [libp2p] = await peerUtils.createPeer({
      started: false,
      config: {
        ...AddressesOptions,
        addresses: {
          listen: listenAddresses
        }
      }
    })

    await libp2p.start()

    const tmListen = libp2p.transportManager.getAddrs().map((ma) => ma.toString())

    // Announce 2 listen (transport)
    const advertiseMultiaddrs = libp2p.multiaddrs.map((ma) => ma.toString())
    expect(advertiseMultiaddrs.length).to.equal(2)
    tmListen.forEach((m) => {
      expect(advertiseMultiaddrs).to.include(m)
    })
    expect(advertiseMultiaddrs).to.not.include(listenAddresses[0]) // Random Port switch
  })

  it('should only announce the given announce addresses when provided', async () => {
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

    await libp2p.start()

    const tmListen = libp2p.transportManager.getAddrs().map((ma) => ma.toString())

    // Announce 1 announce addr
    const advertiseMultiaddrs = libp2p.multiaddrs.map((ma) => ma.toString())
    expect(advertiseMultiaddrs.length).to.equal(announceAddreses.length)
    advertiseMultiaddrs.forEach((m) => {
      expect(tmListen).to.not.include(m)
      expect(announceAddreses).to.include(m)
    })
  })

  it('can filter out loopback addresses by the announce filter', async () => {
    [libp2p] = await peerUtils.createPeer({
      started: false,
      config: {
        ...AddressesOptions,
        addresses: {
          listen: listenAddresses,
          announceFilter: (multiaddrs) => multiaddrs.filter(m => !isLoopback(m))
        }
      }
    })

    await libp2p.start()

    expect(libp2p.multiaddrs.length).to.equal(0)

    // Stub transportManager addresses to add a public address
    const stubMa = multiaddr('/ip4/120.220.10.1/tcp/1000')
    sinon.stub(libp2p.transportManager, 'getAddrs').returns([
      ...listenAddresses.map((a) => multiaddr(a)),
      stubMa
    ])

    const multiaddrs = libp2p.multiaddrs
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0].equals(stubMa)).to.eql(true)
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

  it('should include observed addresses in returned multiaddrs', async () => {
    [libp2p] = await peerUtils.createPeer({
      started: false,
      config: {
        ...AddressesOptions,
        addresses: {
          listen: listenAddresses
        }
      }
    })
    const ma = '/ip4/83.32.123.53/tcp/43928'

    await libp2p.start()

    expect(libp2p.multiaddrs).to.have.lengthOf(listenAddresses.length)

    libp2p.addressManager.addObservedAddr(ma)

    expect(libp2p.multiaddrs).to.have.lengthOf(listenAddresses.length + 1)
    expect(libp2p.multiaddrs.map(ma => ma.toString())).to.include(ma)
  })
})
