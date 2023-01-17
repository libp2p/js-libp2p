/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { Multiaddr, multiaddr, protocols } from '@multiformats/multiaddr'
import { isLoopback } from '@libp2p/utils/multiaddr/is-loopback'
import { AddressesOptions } from './utils.js'
import { createNode } from '../utils/creators/peer.js'
import type { Libp2pNode } from '../../src/libp2p.js'

const listenAddresses = ['/ip4/127.0.0.1/tcp/0', '/ip4/127.0.0.1/tcp/8000/ws']
const announceAddreses = ['/dns4/peer.io/tcp/433/p2p/12D3KooWNvSZnPi3RrhrTwEY4LuuBeB6K6facKUCJcyWG1aoDd2p']

describe('libp2p.multiaddrs', () => {
  let libp2p: Libp2pNode

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should keep listen addresses after start, even if changed', async () => {
    libp2p = await createNode({
      started: false,
      config: {
        ...AddressesOptions,
        addresses: {
          listen: listenAddresses,
          announce: announceAddreses
        }
      }
    })

    let listenAddrs = libp2p.components.addressManager.getListenAddrs().map(ma => ma.toString())
    expect(listenAddrs).to.have.lengthOf(listenAddresses.length)
    expect(listenAddrs).to.include(listenAddresses[0])
    expect(listenAddrs).to.include(listenAddresses[1])

    // Should not replace listen addresses after transport listen
    // Only transportManager has visibility of the port used
    await libp2p.start()

    listenAddrs = libp2p.components.addressManager.getListenAddrs().map(ma => ma.toString())
    expect(listenAddrs).to.have.lengthOf(listenAddresses.length)
    expect(listenAddrs).to.include(listenAddresses[0])
    expect(listenAddrs).to.include(listenAddresses[1])
  })

  it('should announce transport listen addresses if announce addresses are not provided', async () => {
    libp2p = await createNode({
      started: false,
      config: {
        ...AddressesOptions,
        addresses: {
          listen: listenAddresses
        }
      }
    })

    await libp2p.start()

    const tmListen = libp2p.components.transportManager.getAddrs().map((ma) => ma.toString())

    // Announce 2 listen (transport)
    const advertiseMultiaddrs = libp2p.components.addressManager.getAddresses().map((ma) => ma.decapsulateCode(protocols('p2p').code).toString())

    expect(advertiseMultiaddrs).to.have.lengthOf(2)
    tmListen.forEach((m) => {
      expect(advertiseMultiaddrs).to.include(m)
    })
    expect(advertiseMultiaddrs).to.not.include(listenAddresses[0]) // Random Port switch
  })

  it('should only announce the given announce addresses when provided', async () => {
    libp2p = await createNode({
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

    const tmListen = libp2p.components.transportManager.getAddrs().map((ma) => ma.toString())

    // Announce 1 announce addr
    const advertiseMultiaddrs = libp2p.components.addressManager.getAddresses().map((ma) => ma.decapsulateCode(protocols('p2p').code).toString())
    expect(advertiseMultiaddrs.length).to.equal(announceAddreses.length)
    advertiseMultiaddrs.forEach((m) => {
      expect(tmListen).to.not.include(m)
      expect(announceAddreses).to.include(m)
    })
  })

  it('can filter out loopback addresses by the announce filter', async () => {
    libp2p = await createNode({
      started: false,
      config: {
        ...AddressesOptions,
        addresses: {
          listen: listenAddresses,
          announceFilter: (multiaddrs: Multiaddr[]) => multiaddrs.filter(m => !isLoopback(m))
        }
      }
    })

    await libp2p.start()

    expect(libp2p.components.addressManager.getAddresses()).to.have.lengthOf(0)

    // Stub transportManager addresses to add a public address
    const stubMa = multiaddr('/ip4/120.220.10.1/tcp/1000')
    sinon.stub(libp2p.components.transportManager, 'getAddrs').returns([
      ...listenAddresses.map((a) => multiaddr(a)),
      stubMa
    ])

    const multiaddrs = libp2p.components.addressManager.getAddresses()
    expect(multiaddrs.length).to.equal(1)
    expect(multiaddrs[0].decapsulateCode(protocols('p2p').code).equals(stubMa)).to.eql(true)
  })

  it('can filter out loopback addresses to announced by the announce filter', async () => {
    libp2p = await createNode({
      started: false,
      config: {
        ...AddressesOptions,
        addresses: {
          listen: listenAddresses,
          announce: announceAddreses,
          announceFilter: (multiaddrs: Multiaddr[]) => multiaddrs.filter(m => !isLoopback(m))
        }
      }
    })

    const listenAddrs = libp2p.components.addressManager.getListenAddrs().map((ma) => ma.toString())
    expect(listenAddrs).to.have.lengthOf(listenAddresses.length)
    expect(listenAddrs).to.include(listenAddresses[0])
    expect(listenAddrs).to.include(listenAddresses[1])

    await libp2p.start()

    const loopbackAddrs = libp2p.components.addressManager.getAddresses().filter(ma => isLoopback(ma))
    expect(loopbackAddrs).to.be.empty()
  })

  it('should include observed addresses in returned multiaddrs', async () => {
    libp2p = await createNode({
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

    expect(libp2p.components.addressManager.getAddresses()).to.have.lengthOf(listenAddresses.length)

    libp2p.components.addressManager.addObservedAddr(multiaddr(ma))

    expect(libp2p.components.addressManager.getAddresses()).to.have.lengthOf(listenAddresses.length + 1)
    expect(libp2p.components.addressManager.getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code).toString())).to.include(ma)
  })
})
