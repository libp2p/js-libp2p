'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const multiaddr = require('multiaddr')

const AddressManager = require('../../src/address-manager')
const peerUtils = require('../utils/creators/peer')

const listenAddresses = ['/ip4/127.0.0.1/tcp/15006/ws', '/ip4/127.0.0.1/tcp/15008/ws']
const announceAddreses = ['/dns4/peer.io']

describe('Address Manager', () => {
  it('should not need any addresses', () => {
    const am = new AddressManager()

    expect(am.listen.size).to.equal(0)
    expect(am.announce.size).to.equal(0)
  })

  it('should return listen multiaddrs on get', () => {
    const am = new AddressManager({
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
    const am = new AddressManager({
      listen: listenAddresses,
      announce: announceAddreses
    })

    expect(am.listen.size).to.equal(listenAddresses.length)
    expect(am.announce.size).to.equal(announceAddreses.length)

    const announceMultiaddrs = am.getAnnounceAddrs()
    expect(announceMultiaddrs.length).to.equal(1)
    expect(announceMultiaddrs[0].equals(multiaddr(announceAddreses[0]))).to.equal(true)
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
