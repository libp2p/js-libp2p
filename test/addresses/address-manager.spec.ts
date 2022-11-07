/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { multiaddr, protocols } from '@multiformats/multiaddr'
import { AddressFilter, DefaultAddressManager } from '../../src/address-manager/index.js'
import { createNode } from '../utils/creators/peer.js'
import { createFromJSON } from '@libp2p/peer-id-factory'
import Peers from '../fixtures/peers.js'
import { stubInterface } from 'sinon-ts'
import type { TransportManager } from '@libp2p/interface-transport'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Libp2p } from '../../src/index.js'

const listenAddresses = ['/ip4/127.0.0.1/tcp/15006/ws', '/ip4/127.0.0.1/tcp/15008/ws']
const announceAddreses = ['/dns4/peer.io']

describe('Address Manager', () => {
  let peerId: PeerId

  before(async () => {
    peerId = await createFromJSON(Peers[0])
  })

  it('should not need any addresses', () => {
    const am = new DefaultAddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>()
    }, {
      announceFilter: stubInterface<AddressFilter>()
    })

    expect(am.getListenAddrs()).to.be.empty()
    expect(am.getAnnounceAddrs()).to.be.empty()
  })

  it('should return listen multiaddrs on get', () => {
    const am = new DefaultAddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>()
    }, {
      announceFilter: stubInterface<AddressFilter>(),
      listen: listenAddresses
    })

    expect(am.getListenAddrs()).to.have.lengthOf(listenAddresses.length)
    expect(am.getAnnounceAddrs()).to.be.empty()

    const listenMultiaddrs = am.getListenAddrs()
    expect(listenMultiaddrs.length).to.equal(2)
    expect(listenMultiaddrs[0].equals(multiaddr(listenAddresses[0]))).to.equal(true)
    expect(listenMultiaddrs[1].equals(multiaddr(listenAddresses[1]))).to.equal(true)
  })

  it('should return announce multiaddrs on get', () => {
    const am = new DefaultAddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>()
    }, {
      announceFilter: stubInterface<AddressFilter>(),
      listen: listenAddresses,
      announce: announceAddreses
    })

    expect(am.getListenAddrs()).to.have.lengthOf(listenAddresses.length)
    expect(am.getAnnounceAddrs()).to.have.lengthOf(announceAddreses.length)

    const announceMultiaddrs = am.getAnnounceAddrs()
    expect(announceMultiaddrs.length).to.equal(1)
    expect(announceMultiaddrs[0].equals(multiaddr(announceAddreses[0]))).to.equal(true)
  })

  it('should add observed addresses', () => {
    const am = new DefaultAddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>()
    }, {
      announceFilter: stubInterface<AddressFilter>()
    })

    expect(am.getObservedAddrs()).to.be.empty()

    am.addObservedAddr('/ip4/123.123.123.123/tcp/39201')

    expect(am.getObservedAddrs()).to.have.lengthOf(1)
  })

  it('should dedupe added observed addresses', () => {
    const ma = '/ip4/123.123.123.123/tcp/39201'
    const am = new DefaultAddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>()
    }, {
      announceFilter: stubInterface<AddressFilter>()
    })

    expect(am.getObservedAddrs()).to.be.empty()

    am.addObservedAddr(ma)
    am.addObservedAddr(ma)
    am.addObservedAddr(ma)

    expect(am.getObservedAddrs()).to.have.lengthOf(1)
    expect(am.getObservedAddrs().map(ma => ma.toString())).to.include(ma)
  })

  it('should only emit one change:addresses event', () => {
    const ma = '/ip4/123.123.123.123/tcp/39201'
    const am = new DefaultAddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>()
    }, {
      announceFilter: stubInterface<AddressFilter>()
    })
    let eventCount = 0

    am.addEventListener('change:addresses', () => {
      eventCount++
    })

    am.addObservedAddr(ma)
    am.addObservedAddr(ma)
    am.addObservedAddr(ma)
    am.addObservedAddr(`${ma}/p2p/${peerId.toString()}`)

    expect(eventCount).to.equal(1)
  })

  it('should strip our peer address from added observed addresses', () => {
    const ma = '/ip4/123.123.123.123/tcp/39201'
    const am = new DefaultAddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>()
    }, {
      announceFilter: stubInterface<AddressFilter>()
    })

    expect(am.getObservedAddrs()).to.be.empty()

    am.addObservedAddr(ma)
    am.addObservedAddr(`${ma}/p2p/${peerId.toString()}`)

    expect(am.getObservedAddrs()).to.have.lengthOf(1)
    expect(am.getObservedAddrs().map(ma => ma.toString())).to.include(ma)
  })

  it('should strip our peer address from added observed addresses in difference formats', () => {
    const ma = '/ip4/123.123.123.123/tcp/39201'
    const am = new DefaultAddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>()
    }, {
      announceFilter: stubInterface<AddressFilter>()
    })

    expect(am.getObservedAddrs()).to.be.empty()

    am.addObservedAddr(ma)
    am.addObservedAddr(`${ma}/p2p/${peerId.toString()}`)

    expect(am.getObservedAddrs()).to.have.lengthOf(1)
    expect(am.getObservedAddrs().map(ma => ma.toString())).to.include(ma)
  })
})

describe('libp2p.addressManager', () => {
  let libp2p: Libp2p
  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should populate the AddressManager from the config', async () => {
    libp2p = await createNode({
      started: false,
      config: {
        addresses: {
          listen: listenAddresses,
          announce: announceAddreses
        }
      }
    })

    expect(libp2p.getMultiaddrs().map(ma => ma.decapsulateCode(protocols('p2p').code).toString())).to.have.members(announceAddreses)
    expect(libp2p.getMultiaddrs().map(ma => ma.decapsulateCode(protocols('p2p').code).toString())).to.not.have.members(listenAddresses)
  })
})
