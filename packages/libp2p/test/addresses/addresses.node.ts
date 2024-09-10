/* eslint-env mocha */

import { plaintext } from '@libp2p/plaintext'
import { isLoopback } from '@libp2p/utils/multiaddr/is-loopback'
import { webSockets } from '@libp2p/websockets'
import { type Multiaddr, multiaddr, protocols } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import sinon from 'sinon'
import { createNode } from '../fixtures/creators/peer.js'
import { getComponent } from '../fixtures/get-component.js'
import { AddressesOptions } from './utils.js'
import type { Libp2p, PeerUpdate } from '@libp2p/interface'
import type { AddressManager, TransportManager } from '@libp2p/interface-internal'

const listenAddresses = ['/ip4/127.0.0.1/tcp/0', '/ip4/127.0.0.1/tcp/8000/ws']
const announceAddresses = ['/dns4/peer.io/tcp/433/p2p/12D3KooWNvSZnPi3RrhrTwEY4LuuBeB6K6facKUCJcyWG1aoDd2p']

describe('libp2p.addressManager', () => {
  let libp2p: Libp2p

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
          announce: announceAddresses
        }
      }
    })

    const addressManager = getComponent<AddressManager>(libp2p, 'addressManager')
    let listenAddrs = addressManager.getListenAddrs().map(ma => ma.toString())
    expect(listenAddrs).to.have.lengthOf(listenAddresses.length)
    expect(listenAddrs).to.include(listenAddresses[0])
    expect(listenAddrs).to.include(listenAddresses[1])

    // Should not replace listen addresses after transport listen
    // Only transportManager has visibility of the port used
    await libp2p.start()

    listenAddrs = addressManager.getListenAddrs().map(ma => ma.toString())
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

    const tmListen = getComponent<TransportManager>(libp2p, 'transportManager').getAddrs().map((ma) => ma.toString())

    // Announce 2 listen (transport)
    const advertiseMultiaddrs = getComponent<AddressManager>(libp2p, 'addressManager').getAddresses().map((ma) => ma.decapsulateCode(protocols('p2p').code).toString())

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
          announce: announceAddresses
        }
      }
    })

    await libp2p.start()

    const tmListen = getComponent<TransportManager>(libp2p, 'transportManager').getAddrs().map((ma) => ma.toString())

    // Announce 1 announce addr
    const advertiseMultiaddrs = getComponent<AddressManager>(libp2p, 'addressManager').getAddresses().map((ma) => ma.decapsulateCode(protocols('p2p').code).toString())
    expect(advertiseMultiaddrs.length).to.equal(announceAddresses.length)
    advertiseMultiaddrs.forEach((m) => {
      expect(tmListen).to.not.include(m)
      expect(announceAddresses).to.include(m)
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

    expect(getComponent<AddressManager>(libp2p, 'addressManager').getAddresses()).to.have.lengthOf(0)

    // Stub transportManager addresses to add a public address
    const stubMa = multiaddr('/ip4/120.220.10.1/tcp/1000')
    sinon.stub(getComponent<TransportManager>(libp2p, 'transportManager'), 'getAddrs').returns([
      ...listenAddresses.map((a) => multiaddr(a)),
      stubMa
    ])

    const multiaddrs = getComponent<AddressManager>(libp2p, 'addressManager').getAddresses()
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
          announce: announceAddresses,
          announceFilter: (multiaddrs: Multiaddr[]) => multiaddrs.filter(m => !isLoopback(m))
        }
      }
    })

    const listenAddrs = getComponent<AddressManager>(libp2p, 'addressManager').getListenAddrs().map((ma) => ma.toString())
    expect(listenAddrs).to.have.lengthOf(listenAddresses.length)
    expect(listenAddrs).to.include(listenAddresses[0])
    expect(listenAddrs).to.include(listenAddresses[1])

    await libp2p.start()

    const loopbackAddrs = getComponent<AddressManager>(libp2p, 'addressManager').getAddresses().filter(ma => isLoopback(ma))
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

    const addressManager = getComponent<AddressManager>(libp2p, 'addressManager')

    expect(addressManager.getAddresses()).to.have.lengthOf(listenAddresses.length)

    addressManager.confirmObservedAddr(multiaddr(ma))

    expect(addressManager.getAddresses()).to.have.lengthOf(listenAddresses.length + 1)
    expect(addressManager.getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code).toString())).to.include(ma)
  })

  it('should populate the AddressManager from the config', async () => {
    libp2p = await createNode({
      started: false,
      config: {
        addresses: {
          listen: listenAddresses,
          announce: announceAddresses
        },
        transports: [
          webSockets()
        ],
        connectionEncrypters: [
          plaintext()
        ]
      }
    })

    expect(libp2p.getMultiaddrs().map(ma => ma.decapsulateCode(protocols('p2p').code).toString())).to.have.members(announceAddresses)
    expect(libp2p.getMultiaddrs().map(ma => ma.decapsulateCode(protocols('p2p').code).toString())).to.not.have.members(listenAddresses)
  })

  it('should update our peer record with announce addresses on startup', async () => {
    libp2p = await createNode({
      started: false,
      config: {
        addresses: {
          listen: listenAddresses,
          announce: announceAddresses
        },
        transports: [
          webSockets()
        ],
        connectionEncrypters: [
          plaintext()
        ]
      }
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
    libp2p = await createNode({
      started: false,
      config: {
        addresses: {
          listen: listenAddresses,
          announce: announceAddresses
        },
        transports: [
          webSockets()
        ],
        connectionEncrypters: [
          plaintext()
        ]
      }
    })

    await libp2p.start()

    const eventPromise = pEvent<'self:peer:update', CustomEvent<PeerUpdate>>(libp2p, 'self:peer:update')

    const unconfirmedAddress = multiaddr('/ip4/127.0.0.1/tcp/4010/ws')
    getComponent<AddressManager>(libp2p, 'addressManager').addObservedAddr(unconfirmedAddress)

    const confirmedAddress = multiaddr('/ip4/127.0.0.1/tcp/4011/ws')
    getComponent<AddressManager>(libp2p, 'addressManager').confirmObservedAddr(confirmedAddress)

    const event = await eventPromise

    expect(event.detail.peer.addresses.map(({ multiaddr }) => multiaddr.toString()))
      .to.not.include(unconfirmedAddress.toString(), 'peer info included unconfirmed observed address')

    expect(event.detail.peer.addresses.map(({ multiaddr }) => multiaddr.toString()))
      .to.include(confirmedAddress.toString(), 'peer info did not include confirmed observed address')
  })
})
