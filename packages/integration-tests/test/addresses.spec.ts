/* eslint-env mocha */

import { memory } from '@libp2p/memory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import { pEvent } from 'p-event'
import type { Libp2p, PeerUpdate } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { Multiaddr } from '@multiformats/multiaddr'

const listenAddresses = ['/memory/address-1', '/memory/address-2']
const announceAddresses = ['/dns4/peer.io/tcp/433/p2p/12D3KooWNvSZnPi3RrhrTwEY4LuuBeB6K6facKUCJcyWG1aoDd2p']

describe('addresses', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    await libp2p?.stop()
  })

  it('should return transport listen addresses if announce addresses are not provided', async () => {
    libp2p = await createLibp2p({
      addresses: {
        listen: listenAddresses
      },
      transports: [
        memory()
      ]
    })

    expect(libp2p.getMultiaddrs().map(ma => ma.decapsulate('/p2p').toString())).to.deep.equal(listenAddresses)
  })

  it('should override listen addresses with announce addresses when provided', async () => {
    libp2p = await createLibp2p({
      addresses: {
        listen: listenAddresses,
        announce: announceAddresses
      },
      transports: [
        memory()
      ]
    })

    expect(libp2p.getMultiaddrs().map(ma => ma.decapsulate('/p2p').toString())).to.deep.equal(announceAddresses)
  })

  it('should filter listen addresses filtered by the announce filter', async () => {
    libp2p = await createLibp2p({
      addresses: {
        listen: listenAddresses,
        announceFilter: (multiaddrs: Multiaddr[]) => multiaddrs.slice(1)
      },
      transports: [
        memory()
      ]
    })

    expect(libp2p.getMultiaddrs().map(ma => ma.decapsulate('/p2p').toString())).to.deep.equal([listenAddresses[1]])
  })

  it('should filter announce addresses filtered by the announce filter', async () => {
    libp2p = await createLibp2p({
      addresses: {
        listen: listenAddresses,
        announce: announceAddresses,
        announceFilter: () => []
      },
      transports: [
        memory()
      ]
    })

    expect(libp2p.getMultiaddrs().map(ma => ma.decapsulate('/p2p').toString())).to.have.lengthOf(0)
  })

  it('should include observed addresses in returned multiaddrs', async () => {
    const ma = '/ip4/83.32.123.53/tcp/43928'

    libp2p = await createLibp2p({
      start: false,
      addresses: {
        listen: listenAddresses
      },
      transports: [
        memory()
      ],
      services: {
        observer: (components: { addressManager: AddressManager }) => {
          components.addressManager.confirmObservedAddr(multiaddr(ma))
        }
      }
    })

    expect(libp2p.getMultiaddrs().map(ma => ma.decapsulate('/p2p').toString())).to.include(ma)
  })

  it('should update our peer record with announce addresses on startup', async () => {
    libp2p = await createLibp2p({
      start: false,
      addresses: {
        listen: listenAddresses,
        announce: announceAddresses
      },
      transports: [
        memory()
      ]
    })

    const eventPromise = pEvent<'self:peer:update', CustomEvent<PeerUpdate>>(libp2p, 'self:peer:update', {
      filter: (event) => {
        return event.detail.peer.addresses.map(({ multiaddr }) => multiaddr.toString())
          .includes(announceAddresses[0])
      }
    })

    await libp2p.start()

    const event = await eventPromise

    expect(event.detail.peer.addresses.map(({ multiaddr }) => multiaddr.toString()))
      .to.include.members(announceAddresses, 'peer info did not include announce addresses')
  })

  it('should only include confirmed observed addresses in peer record', async () => {
    const unconfirmedAddress = '/ip4/127.0.0.1/tcp/4010/ws'
    const confirmedAddress = '/ip4/127.0.0.1/tcp/4011/ws'

    libp2p = await createLibp2p({
      start: false,
      addresses: {
        listen: listenAddresses,
        announce: announceAddresses
      },
      transports: [
        memory()
      ],
      services: {
        observer: (components: { addressManager: AddressManager }) => {
          components.addressManager.confirmObservedAddr(multiaddr(confirmedAddress))
          components.addressManager.addObservedAddr(multiaddr(unconfirmedAddress))
        }
      }
    })

    await libp2p.start()

    const eventPromise = pEvent<'self:peer:update', CustomEvent<PeerUpdate>>(libp2p, 'self:peer:update')

    const event = await eventPromise

    expect(event.detail.peer.addresses.map(({ multiaddr }) => multiaddr.toString()))
      .to.not.include(unconfirmedAddress, 'peer info included unconfirmed observed address')

    expect(event.detail.peer.addresses.map(({ multiaddr }) => multiaddr.toString()))
      .to.include(confirmedAddress, 'peer info did not include confirmed observed address')
  })
})
