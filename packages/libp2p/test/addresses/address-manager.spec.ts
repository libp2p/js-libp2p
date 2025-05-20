/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { AddressManager } from '../../src/address-manager/index.js'
import type { AddressFilter } from '../../src/address-manager/index.js'
import type { TypedEventTarget, Libp2pEvents, PeerId, PeerStore, Peer, Listener } from '@libp2p/interface'
import type { NodeAddress, TransportManager } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

const listenAddresses = ['/ip4/127.0.0.1/tcp/15006/ws', '/ip4/127.0.0.1/tcp/15008/ws']
const announceAddresses = ['/dns4/peer.io']

describe('Address Manager', () => {
  let peerId: PeerId
  let peerStore: StubbedInstance<PeerStore>
  let events: TypedEventTarget<Libp2pEvents>

  beforeEach(async () => {
    peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    peerStore = stubInterface<PeerStore>({
      patch: Sinon.stub().resolves(stubInterface<Peer>())
    })
    events = new TypedEventEmitter()
  })

  it('should not need any addresses', () => {
    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>(),
      peerStore,
      events,
      logger: defaultLogger()
    }, {
      announceFilter: stubInterface<AddressFilter>()
    })

    expect(am.getListenAddrs()).to.be.empty()
    expect(am.getAnnounceAddrs()).to.be.empty()
  })

  it('should return listen multiaddrs on get', () => {
    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>(),
      peerStore,
      events,
      logger: defaultLogger()
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
    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>(),
      peerStore,
      events,
      logger: defaultLogger()
    }, {
      announceFilter: stubInterface<AddressFilter>(),
      listen: listenAddresses,
      announce: announceAddresses
    })

    expect(am.getListenAddrs()).to.have.lengthOf(listenAddresses.length)
    expect(am.getAnnounceAddrs()).to.have.lengthOf(announceAddresses.length)

    const announceMultiaddrs = am.getAnnounceAddrs()
    expect(announceMultiaddrs.length).to.equal(1)
    expect(announceMultiaddrs[0].equals(multiaddr(announceAddresses[0]))).to.equal(true)
  })

  it('should add appendAnnounce multiaddrs on get', () => {
    const transportManager = stubInterface<TransportManager>({
      getListeners: Sinon.stub().returns([])
    })
    const am = new AddressManager({
      peerId,
      transportManager,
      peerStore,
      events,
      logger: defaultLogger()
    }, {
      announceFilter: (mas) => mas,
      listen: listenAddresses,
      appendAnnounce: announceAddresses
    })

    transportManager.getAddrs.returns(listenAddresses.map(ma => multiaddr(ma)))

    expect(am.getListenAddrs()).to.have.lengthOf(listenAddresses.length)
    expect(am.getAppendAnnounceAddrs()).to.have.lengthOf(announceAddresses.length)

    const announceMultiaddrs = am.getAddresses()
    expect(announceMultiaddrs.length).to.equal(3)
    expect(announceMultiaddrs.map(ma => ma.toString())).to.deep.equal([
      ...listenAddresses.map(ma => `${ma}/p2p/${peerId}`),
      ...announceAddresses.map(ma => `${ma}/p2p/${peerId}`)
    ])
  })

  it('should add observed addresses', () => {
    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>(),
      peerStore,
      events,
      logger: defaultLogger()
    }, {
      announceFilter: stubInterface<AddressFilter>()
    })

    expect(am.getObservedAddrs()).to.be.empty()

    am.addObservedAddr(multiaddr('/ip4/123.123.123.123/tcp/39201'))

    expect(am.getObservedAddrs()).to.have.lengthOf(1)
  })

  it('should limit observed addresses', () => {
    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>(),
      peerStore,
      events,
      logger: defaultLogger()
    }, {
      announceFilter: stubInterface<AddressFilter>()
    })

    expect(am.getObservedAddrs()).to.be.empty()

    for (let i = 0; i < 100; i++) {
      am.addObservedAddr(multiaddr(`/ip4/123.123.123.123/tcp/392${i}`))
    }

    expect(am.getObservedAddrs()).to.have.lengthOf(10)
  })

  it('should allow duplicate listen addresses', () => {
    const ma = multiaddr('/ip4/0.0.0.0/tcp/0')
    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>(),
      peerStore,
      events,
      logger: defaultLogger()
    }, {
      announceFilter: stubInterface<AddressFilter>(),
      listen: [
        ma.toString(),
        ma.toString()
      ]
    })

    expect(am.getListenAddrs()).to.deep.equal([
      ma,
      ma
    ])
  })

  it('should dedupe added observed addresses', () => {
    const ma = multiaddr('/ip4/123.123.123.123/tcp/39201')
    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>(),
      peerStore,
      events,
      logger: defaultLogger()
    }, {
      announceFilter: stubInterface<AddressFilter>()
    })

    expect(am.getObservedAddrs()).to.be.empty()

    am.addObservedAddr(ma)
    am.addObservedAddr(ma)
    am.addObservedAddr(ma)

    expect(am.getObservedAddrs()).to.have.lengthOf(1)
    expect(am.getObservedAddrs().map(ma => ma.toString())).to.include(ma.toString())
  })

  it('should only set addresses once', async () => {
    const ma = '/ip4/123.123.123.123/tcp/39201'
    const ma2 = `${ma.toString()}/p2p/${peerId.toString()}`
    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>({
        getAddrs: Sinon.stub().returns([]),
        getListeners: Sinon.stub().returns([])
      }),
      peerStore,
      events,
      logger: defaultLogger()
    })

    am.addObservedAddr(multiaddr(ma))
    am.addObservedAddr(multiaddr(ma2))

    am.confirmObservedAddr(multiaddr(ma))
    am.confirmObservedAddr(multiaddr(ma))
    am.confirmObservedAddr(multiaddr(ma))
    am.confirmObservedAddr(multiaddr(ma2))

    // wait for address manager _updatePeerStoreAddresses debounce
    await delay(1500)

    expect(peerStore.patch).to.have.property('callCount', 1)
  })

  it('should strip our peer address from added observed addresses', () => {
    const ma = multiaddr('/ip4/123.123.123.123/tcp/39201')
    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>(),
      peerStore,
      events,
      logger: defaultLogger()
    })

    expect(am.getObservedAddrs()).to.be.empty()

    am.addObservedAddr(ma)
    am.addObservedAddr(multiaddr(`${ma.toString()}/p2p/${peerId.toString()}`))

    expect(am.getObservedAddrs()).to.have.lengthOf(1)
    expect(am.getObservedAddrs().map(ma => ma.toString())).to.include(ma.toString())
  })

  it('should strip our peer address from added observed addresses in difference formats', () => {
    const ma = multiaddr('/ip4/123.123.123.123/tcp/39201')
    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>(),
      peerStore,
      events,
      logger: defaultLogger()
    })

    expect(am.getObservedAddrs()).to.be.empty()

    am.addObservedAddr(ma)
    am.addObservedAddr(multiaddr(`${ma.toString()}/p2p/${peerId.toString()}`))

    expect(am.getObservedAddrs()).to.have.lengthOf(1)
    expect(am.getObservedAddrs().map(ma => ma.toString())).to.include(ma.toString())
  })

  it('should not add our peer id to path multiaddrs', () => {
    const ma = '/unix/foo/bar/baz'
    const transportManager = stubInterface<TransportManager>()
    const am = new AddressManager({
      peerId,
      transportManager,
      peerStore,
      events,
      logger: defaultLogger()
    }, {
      listen: [ma],
      announce: []
    })

    transportManager.getAddrs.returns([multiaddr(ma)])

    const addrs = am.getAddresses()
    expect(addrs).to.have.lengthOf(1)
    expect(addrs[0].toString()).to.not.include(`/p2p/${peerId.toString()}`)
  })

  it('should add an IPv4 DNS mapping', () => {
    const transportManager = stubInterface<TransportManager>()

    const am = new AddressManager({
      peerId,
      transportManager,
      peerStore,
      events,
      logger: defaultLogger()
    })

    const internalIp = '192.168.1.123'
    const internalPort = 1234
    const protocol = 'tcp'

    // one loopback, one LAN, one TLS address
    transportManager.getAddrs.returns([
      multiaddr(`/ip4/127.0.0.1/${protocol}/${internalPort}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/tls/ws`)
    ])

    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/127.0.0.1/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/tls/ws/p2p/${peerId}`)
    ])

    const domain = 'example.com'
    const externalIp = '81.12.12.1'
    const externalPort = 4566

    am.addDNSMapping(domain, [externalIp])
    am.addPublicAddressMapping(internalIp, internalPort, externalIp, externalPort, 'tcp')

    // have not verified DNS mapping so it is not included
    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/127.0.0.1/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/tls/ws/p2p/${peerId}`)
    ])

    // confirm public IP and DNS mapping
    am.confirmObservedAddr(multiaddr(`/ip4/${externalIp}/tcp/${externalPort}`))
    am.confirmObservedAddr(multiaddr(`/dns4/${domain}/tcp/${externalPort}`))

    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/127.0.0.1/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/tls/ws/p2p/${peerId}`),
      multiaddr(`/ip4/${externalIp}/tcp/${externalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${externalIp}/tcp/${externalPort}/tls/sni/${domain}/ws/p2p/${peerId}`)
    ])
  })

  it('should add an IPv6 DNS mapping', () => {
    const transportManager = stubInterface<TransportManager>()

    const am = new AddressManager({
      peerId,
      transportManager,
      peerStore,
      events,
      logger: defaultLogger()
    })

    const internalIp = '192.168.1.123'
    const internalPort = 1234
    const protocol = 'tcp'

    // one loopback, one LAN, one TLS address
    transportManager.getAddrs.returns([
      multiaddr(`/ip4/127.0.0.1/${protocol}/${internalPort}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/tls/ws`)
    ])

    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/127.0.0.1/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/tls/ws/p2p/${peerId}`)
    ])

    const domain = 'example.com'
    const externalIp = '2a00:23c6:14b1:7e00:c010:8ecf:2a25:dcd1'
    const externalPort = 4566

    am.addDNSMapping(domain, [externalIp])
    am.addPublicAddressMapping(internalIp, internalPort, externalIp, externalPort, 'tcp')

    // have not verified DNS mapping so it is not included
    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/127.0.0.1/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/tls/ws/p2p/${peerId}`)
    ])

    // confirm public IP and DNS mapping
    am.confirmObservedAddr(multiaddr(`/ip6/${externalIp}/tcp/${externalPort}`))
    am.confirmObservedAddr(multiaddr(`/dns6/${domain}/tcp/${externalPort}`))

    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/127.0.0.1/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/tls/ws/p2p/${peerId}`),
      multiaddr(`/ip6/${externalIp}/tcp/${externalPort}/p2p/${peerId}`),
      multiaddr(`/ip6/${externalIp}/tcp/${externalPort}/tls/sni/${domain}/ws/p2p/${peerId}`)
    ])
  })

  it('should remove a DNS mapping', () => {
    const transportManager = stubInterface<TransportManager>()

    const am = new AddressManager({
      peerId,
      transportManager,
      peerStore,
      events,
      logger: defaultLogger()
    })

    const internalIp = '192.168.1.123'
    const internalPort = 1234
    const protocol = 'tcp'

    // one loopback, one LAN, one TLS address
    transportManager.getAddrs.returns([
      multiaddr(`/ip4/127.0.0.1/${protocol}/${internalPort}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/tls/ws`)
    ])

    const domain = 'example.com'
    const externalIp = '81.12.12.1'
    const externalPort = 4566

    am.addDNSMapping(domain, [externalIp])
    am.addPublicAddressMapping(internalIp, internalPort, externalIp, externalPort, protocol)

    // confirm public IP and DNS mapping
    am.confirmObservedAddr(multiaddr(`/ip4/${externalIp}/tcp/${externalPort}`))
    am.confirmObservedAddr(multiaddr(`/dns4/${domain}/tcp/${externalPort}`))

    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/127.0.0.1/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/tls/ws/p2p/${peerId}`),
      multiaddr(`/ip4/${externalIp}/tcp/${externalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${externalIp}/tcp/${externalPort}/tls/sni/${domain}/ws/p2p/${peerId}`)
    ])

    // remove DNS mapping
    am.removeDNSMapping(domain)

    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/127.0.0.1/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/tls/ws/p2p/${peerId}`),
      multiaddr(`/ip4/${externalIp}/tcp/${externalPort}/p2p/${peerId}`),
      multiaddr(`/ip4/${externalIp}/tcp/${externalPort}/tls/ws/p2p/${peerId}`)
    ])
  })

  it('should add a public IPv4 address mapping', () => {
    const transportManager = stubInterface<TransportManager>()
    const am = new AddressManager({
      peerId,
      transportManager,
      peerStore,
      events,
      logger: defaultLogger()
    })

    const internalIp = '192.168.1.123'
    const internalPort = 4567
    const externalIp = '81.12.12.1'
    const externalPort = 8910
    const protocol = 'tcp'

    am.addPublicAddressMapping(internalIp, internalPort, externalIp, externalPort, protocol)

    // one loopback, one LAN address
    transportManager.getAddrs.returns([
      multiaddr('/ip4/127.0.0.1/tcp/1234'),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}`)
    ])

    // not confirmed the mapping yet
    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/127.0.0.1/tcp/1234/p2p/${peerId.toString()}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`)
    ])

    // confirm IP mapping
    am.confirmObservedAddr(multiaddr(`/ip4/${externalIp}/${protocol}/${externalPort}`))

    // should have mapped the LAN address to the external IP
    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/127.0.0.1/tcp/1234/p2p/${peerId.toString()}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`),
      multiaddr(`/ip4/${externalIp}/${protocol}/${externalPort}/p2p/${peerId.toString()}`)
    ])

    am.removePublicAddressMapping(internalIp, internalPort, externalIp, externalPort, protocol)

    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/127.0.0.1/tcp/1234/p2p/${peerId.toString()}`),
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`)
    ])
  })

  it('should add a public IPv6 address mapping', () => {
    const transportManager = stubInterface<TransportManager>()
    const am = new AddressManager({
      peerId,
      transportManager,
      peerStore,
      events,
      logger: defaultLogger()
    })

    const internalIp = 'fd9b:ec6c:a487:efd2:14bc:d40:b478:9555'
    const internalPort = 4567
    const externalIp = '2a00:23c6:14b1:7e00:28b8:30d:944e:27f3'
    const externalPort = 8910
    const protocol = 'tcp'

    am.addPublicAddressMapping(internalIp, internalPort, externalIp, externalPort, protocol)

    // one loopback, one LAN address
    transportManager.getAddrs.returns([
      multiaddr('/ip6/::1/tcp/1234'),
      multiaddr(`/ip6/${internalIp}/${protocol}/${internalPort}`)
    ])

    // not confirmed the mapping yet
    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip6/::1/tcp/1234/p2p/${peerId.toString()}`),
      multiaddr(`/ip6/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`)
    ])

    // confirm IP mapping
    am.confirmObservedAddr(multiaddr(`/ip6/${externalIp}/${protocol}/${externalPort}`))

    // should have mapped the LAN address to the external IP
    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip6/::1/tcp/1234/p2p/${peerId.toString()}`),
      multiaddr(`/ip6/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`),
      multiaddr(`/ip6/${externalIp}/${protocol}/${externalPort}/p2p/${peerId.toString()}`)
    ])

    am.removePublicAddressMapping(internalIp, internalPort, externalIp, externalPort, protocol)

    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip6/::1/tcp/1234/p2p/${peerId.toString()}`),
      multiaddr(`/ip6/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`)
    ])
  })

  it('should add a public IPv4 address mapping when only local IPv6 addresses are present', () => {
    const transportManager = stubInterface<TransportManager>()
    const am = new AddressManager({
      peerId,
      transportManager,
      peerStore,
      events,
      logger: defaultLogger()
    })

    /* spell-checker:disable-next-line */
    const internalIp = 'fdad:23c6:14b1:7e00:28b8:30d:944e:27f3'
    const internalPort = 4567
    const externalIp = '81.12.12.1'
    const externalPort = 8910
    const protocol = 'tcp'

    am.addPublicAddressMapping(internalIp, internalPort, externalIp, externalPort, protocol)

    // one loopback, one LAN address
    transportManager.getAddrs.returns([
      multiaddr(`/ip6/${internalIp}/${protocol}/${internalPort}`)
    ])

    // confirm IP mapping
    am.confirmObservedAddr(multiaddr(`/ip4/${externalIp}/${protocol}/${externalPort}`))

    // should have mapped the LAN address to the external IP
    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip6/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`),
      multiaddr(`/ip4/${externalIp}/${protocol}/${externalPort}/p2p/${peerId.toString()}`)
    ])

    am.removePublicAddressMapping(internalIp, internalPort, externalIp, externalPort, protocol)

    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip6/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`)
    ])
  })

  it('should require confirmation of global unicast IPv6 addresses', () => {
    const transportManager = stubInterface<TransportManager>()
    const am = new AddressManager({
      peerId,
      transportManager,
      peerStore,
      events,
      logger: defaultLogger()
    })

    const internalIp = '2a01:23c6:14b1:7e00:28b8:30d:944e:27f3'
    const internalPort = 4567
    const externalIp = '81.12.12.1'
    const externalPort = 8910
    const protocol = 'tcp'

    am.addPublicAddressMapping(internalIp, internalPort, externalIp, externalPort, protocol)

    // one loopback, one LAN address
    transportManager.getAddrs.returns([
      multiaddr(`/ip6/${internalIp}/${protocol}/${internalPort}`)
    ])

    expect(am.getAddresses()).to.be.empty()

    // confirm global IP
    am.confirmObservedAddr(multiaddr(`/ip6/${internalIp}/${protocol}/${internalPort}`))

    // should include IP now
    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip6/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`)
    ])
  })

  it('should add a public IPv6 address mapping when only local IPv4 addresses are present', () => {
    const transportManager = stubInterface<TransportManager>()
    const am = new AddressManager({
      peerId,
      transportManager,
      peerStore,
      events,
      logger: defaultLogger()
    })

    const internalIp = '192.168.1.123'
    const internalPort = 4567
    const externalIp = '2a00:23c6:14b1:7e00:28b8:30d:944e:27f3'
    const externalPort = 8910
    const protocol = 'tcp'

    am.addPublicAddressMapping(internalIp, internalPort, externalIp, externalPort, protocol)

    // one loopback, one LAN address
    transportManager.getAddrs.returns([
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}`)
    ])

    // confirm IP mapping
    am.confirmObservedAddr(multiaddr(`/ip6/${externalIp}/${protocol}/${externalPort}`))

    // should have mapped the LAN address to the external IP
    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`),
      multiaddr(`/ip6/${externalIp}/${protocol}/${externalPort}/p2p/${peerId.toString()}`)
    ])

    am.removePublicAddressMapping(internalIp, internalPort, externalIp, externalPort, protocol)

    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`)
    ])
  })

  it('should not confirm unknown observed addresses', () => {
    const transportManager = stubInterface<TransportManager>()
    const am = new AddressManager({
      peerId,
      transportManager,
      peerStore,
      events,
      logger: defaultLogger()
    })

    const internalIp = '192.168.1.123'
    const internalPort = 4567
    const externalIp = '2a00:23c6:14b1:7e00:28b8:30d:944e:27f3'
    const externalPort = 8910
    const protocol = 'tcp'

    // one loopback, one LAN address
    transportManager.getAddrs.returns([
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}`)
    ])

    // confirm address we have not observed
    am.confirmObservedAddr(multiaddr(`/ip6/${externalIp}/${protocol}/${externalPort}`))

    // should not have changed the address list
    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`)
    ])
  })

  it('should confirm unknown observed addresses with hints', () => {
    const transportManager = stubInterface<TransportManager>()
    const am = new AddressManager({
      peerId,
      transportManager,
      peerStore,
      events,
      logger: defaultLogger()
    })

    const internalIp = '192.168.1.123'
    const internalPort = 4567
    const externalIp = '2a00:23c6:14b1:7e00:28b8:30d:944e:27f3'
    const externalPort = 8910
    const protocol = 'tcp'

    // confirm address before fetching addresses
    am.confirmObservedAddr(multiaddr(`/ip6/${externalIp}/${protocol}/${externalPort}`), {
      type: 'transport'
    })

    // one loopback, one LAN address
    transportManager.getAddrs.returns([
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}`),
      multiaddr(`/ip6/${externalIp}/${protocol}/${externalPort}`)
    ])

    // should have changed the address list
    expect(am.getAddresses()).to.deep.equal([
      multiaddr(`/ip4/${internalIp}/${protocol}/${internalPort}/p2p/${peerId.toString()}`),
      multiaddr(`/ip6/${externalIp}/${protocol}/${externalPort}/p2p/${peerId.toString()}`)
    ])
  })

  it('should upgrade an observed address to an IP mapping when confirming an observed address and there is only a single eligible listener', () => {
    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>({
        getAddrs: Sinon.stub().returns([
          multiaddr('/ip4/127.0.0.1/tcp/1234'),
          multiaddr('/ip4/192.168.1.123/tcp/1234')
        ]),
        getListeners: Sinon.stub().returns([
          stubInterface<Listener>({
            getAddrs: Sinon.stub().returns([
              multiaddr('/ip4/127.0.0.1/tcp/1234'),
              multiaddr('/ip4/192.168.1.123/tcp/1234')
            ])
          }),
          stubInterface<Listener>({
            getAddrs: Sinon.stub().returns([
              multiaddr('/ip6/::1/tcp/1234'),
              multiaddr('/ip6/2b01:ab15:3c8:3300:10b8:170e:1087:3b0e/tcp/1234')
            ])
          })
        ])
      }),
      peerStore,
      events,
      logger: defaultLogger()
    })

    expect(am.getObservedAddrs()).to.be.empty()

    const ma = multiaddr('/ip4/123.123.123.123/tcp/39201')
    am.addObservedAddr(ma)
    am.confirmObservedAddr(ma)

    expect(am.getAddressesWithMetadata().map(mapAddress)).to.include.deep.members([{
      multiaddr: ma,
      verified: true,
      type: 'ip-mapping'
    }])

    expect(am.getAddressesWithMetadata().map(mapAddress)).to.not.include.deep.members([{
      multiaddr: ma,
      verified: true,
      type: 'observed'
    }])
  })

  it('should not upgrade an observed address to an IP mapping when confirming an observed address and there are multiple eligible listeners', () => {
    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>({
        getAddrs: Sinon.stub().returns([
          multiaddr('/ip4/127.0.0.1/tcp/1234'),
          multiaddr('/ip4/192.168.1.123/tcp/1234')
        ]),
        getListeners: Sinon.stub().returns([
          stubInterface<Listener>({
            getAddrs: Sinon.stub().returns([
              multiaddr('/ip4/127.0.0.1/tcp/1234'),
              multiaddr('/ip4/192.168.1.123/tcp/1234')
            ])
          }),
          stubInterface<Listener>({
            getAddrs: Sinon.stub().returns([
              multiaddr('/ip4/127.0.0.1/tcp/4567'),
              multiaddr('/ip4/192.168.1.123/tcp/4567')
            ])
          })
        ])
      }),
      peerStore,
      events,
      logger: defaultLogger()
    })

    expect(am.getObservedAddrs()).to.be.empty()

    const ma = multiaddr('/ip4/123.123.123.123/tcp/39201')
    am.addObservedAddr(ma)
    am.confirmObservedAddr(ma)

    expect(am.getAddressesWithMetadata().map(mapAddress)).to.not.include.deep.members([{
      multiaddr: ma,
      verified: true,
      type: 'ip-mapping'
    }])

    expect(am.getAddressesWithMetadata().map(mapAddress)).to.include.deep.members([{
      multiaddr: ma,
      verified: true,
      type: 'observed'
    }])
  })

  it('should allow updating announce addresses', async () => {
    const listener = stubInterface<Listener>({
      updateAnnounceAddrs: Sinon.stub().returnsArg(0)
    })

    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>({
        getListeners: Sinon.stub().returns([
          listener
        ])
      }),
      peerStore,
      events,
      logger: defaultLogger()
    }, {
      announce: [
        '/ip4/123.123.123.123/tcp/1234'
      ]
    })

    expect(am.getAddresses()).to.have.lengthOf(1)
    expect(listener.updateAnnounceAddrs.called).to.be.true()
  })

  it('should allow updating appendAnnounce addresses', async () => {
    const listener = stubInterface<Listener>({
      updateAnnounceAddrs: Sinon.stub().returnsArg(0)
    })

    const am = new AddressManager({
      peerId,
      transportManager: stubInterface<TransportManager>({
        getAddrs: Sinon.stub().returns([
          multiaddr('/ip4/127.0.0.1/tcp/1234'),
          multiaddr('/ip4/192.168.1.123/tcp/1234')
        ]),
        getListeners: Sinon.stub().returns([
          listener
        ])
      }),
      peerStore,
      events,
      logger: defaultLogger()
    }, {
      appendAnnounce: [
        '/ip4/123.123.123.123/tcp/1234'
      ]
    })

    expect(am.getAddresses()).to.have.lengthOf(3)
    expect(listener.updateAnnounceAddrs.called).to.be.true()
  })
})

function mapAddress (addr: NodeAddress): Pick<NodeAddress, 'multiaddr' | 'verified' | 'type'> {
  return {
    multiaddr: addr.multiaddr,
    verified: addr.verified,
    type: addr.type
  }
}
