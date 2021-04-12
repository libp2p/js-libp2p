'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')

const { Multiaddr } = require('multiaddr')
const Resolver = require('multiaddr/src/resolvers/dns')

const { codes: ErrorCodes } = require('../../src/errors')

const peerUtils = require('../utils/creators/peer')
const baseOptions = require('../utils/base-options.browser')

const { MULTIADDRS_WEBSOCKETS } = require('../fixtures/browser')
const relayAddr = MULTIADDRS_WEBSOCKETS[0]

const getDnsaddrStub = (peerId) => [
  [`dnsaddr=/dnsaddr/ams-1.bootstrap.libp2p.io/p2p/${peerId}`],
  [`dnsaddr=/dnsaddr/ams-2.bootstrap.libp2p.io/p2p/${peerId}`],
  [`dnsaddr=/dnsaddr/lon-1.bootstrap.libp2p.io/p2p/${peerId}`],
  [`dnsaddr=/dnsaddr/nrt-1.bootstrap.libp2p.io/p2p/${peerId}`],
  [`dnsaddr=/dnsaddr/nyc-1.bootstrap.libp2p.io/p2p/${peerId}`],
  [`dnsaddr=/dnsaddr/sfo-2.bootstrap.libp2p.io/p2p/${peerId}`]
]

const relayedAddr = (peerId) => `${relayAddr}/p2p-circuit/p2p/${peerId}`

const getDnsRelayedAddrStub = (peerId) => [
  [`dnsaddr=${relayedAddr(peerId)}`]
]

describe('Dialing (resolvable addresses)', () => {
  let libp2p, remoteLibp2p

  beforeEach(async () => {
    [libp2p, remoteLibp2p] = await peerUtils.createPeer({
      number: 2,
      config: {
        ...baseOptions,
        addresses: {
          listen: [new Multiaddr(`${relayAddr}/p2p-circuit`)]
        },
        config: {
          ...baseOptions.config,
          peerDiscovery: {
            autoDial: false
          }
        }
      },
      started: true,
      populateAddressBooks: false
    })
  })

  afterEach(async () => {
    sinon.restore()
    await Promise.all([libp2p, remoteLibp2p].map(n => n.stop()))
  })

  it('resolves dnsaddr to ws local address', async () => {
    const remoteId = remoteLibp2p.peerId.toB58String()
    const dialAddr = new Multiaddr(`/dnsaddr/remote.libp2p.io/p2p/${remoteId}`)
    const relayedAddrFetched = new Multiaddr(relayedAddr(remoteId))

    // Transport spy
    const transport = libp2p.transportManager._transports.get('Circuit')
    sinon.spy(transport, 'dial')

    // Resolver stub
    const stub = sinon.stub(Resolver.prototype, 'resolveTxt')
    stub.onCall(0).returns(Promise.resolve(getDnsRelayedAddrStub(remoteId)))

    // Dial with address resolve
    const connection = await libp2p.dial(dialAddr)
    expect(connection).to.exist()
    expect(connection.remoteAddr.equals(relayedAddrFetched))

    const dialArgs = transport.dial.firstCall.args
    expect(dialArgs[0].equals(relayedAddrFetched)).to.eql(true)
  })

  it('resolves a dnsaddr recursively', async () => {
    const remoteId = remoteLibp2p.peerId.toB58String()
    const dialAddr = new Multiaddr(`/dnsaddr/remote.libp2p.io/p2p/${remoteId}`)
    const relayedAddrFetched = new Multiaddr(relayedAddr(remoteId))

    // Transport spy
    const transport = libp2p.transportManager._transports.get('Circuit')
    sinon.spy(transport, 'dial')

    // Resolver stub
    const stub = sinon.stub(Resolver.prototype, 'resolveTxt')
    let firstCall = false
    stub.callsFake(() => {
      if (!firstCall) {
        firstCall = true
        // Return an array of dnsaddr
        return Promise.resolve(getDnsaddrStub(remoteId))
      }
      return Promise.resolve(getDnsRelayedAddrStub(remoteId))
    })

    // Dial with address resolve
    const connection = await libp2p.dial(dialAddr)
    expect(connection).to.exist()
    expect(connection.remoteAddr.equals(relayedAddrFetched))

    const dialArgs = transport.dial.firstCall.args
    expect(dialArgs[0].equals(relayedAddrFetched)).to.eql(true)
  })

  // TODO: Temporary solution does not resolve dns4/dns6
  // Resolver just returns the received multiaddrs
  it('stops recursive resolve if finds dns4/dns6 and dials it', async () => {
    const remoteId = remoteLibp2p.peerId.toB58String()
    const dialAddr = new Multiaddr(`/dnsaddr/remote.libp2p.io/p2p/${remoteId}`)

    // Stub resolver
    const dnsMa = new Multiaddr(`/dns4/ams-1.remote.libp2p.io/tcp/443/wss/p2p/${remoteId}`)
    const stubResolve = sinon.stub(Resolver.prototype, 'resolveTxt')
    stubResolve.returns(Promise.resolve([
      [`dnsaddr=${dnsMa}`]
    ]))

    // Stub transport
    const transport = libp2p.transportManager._transports.get('WebSockets')
    const stubTransport = sinon.stub(transport, 'dial')
    stubTransport.callsFake((multiaddr) => {
      expect(multiaddr.equals(dnsMa)).to.eql(true)
    })

    await libp2p.dial(dialAddr)
  })

  it('resolves a dnsaddr recursively not failing if one address fails to resolve', async () => {
    const remoteId = remoteLibp2p.peerId.toB58String()
    const dialAddr = new Multiaddr(`/dnsaddr/remote.libp2p.io/p2p/${remoteId}`)
    const relayedAddrFetched = new Multiaddr(relayedAddr(remoteId))

    // Transport spy
    const transport = libp2p.transportManager._transports.get('Circuit')
    sinon.spy(transport, 'dial')

    // Resolver stub
    const stub = sinon.stub(Resolver.prototype, 'resolveTxt')
    stub.onCall(0).callsFake(() => Promise.resolve(getDnsaddrStub(remoteId)))
    stub.onCall(1).callsFake(() => Promise.reject(new Error()))
    stub.callsFake(() => Promise.resolve(getDnsRelayedAddrStub(remoteId)))

    // Dial with address resolve
    const connection = await libp2p.dial(dialAddr)
    expect(connection).to.exist()
    expect(connection.remoteAddr.equals(relayedAddrFetched))

    const dialArgs = transport.dial.firstCall.args
    expect(dialArgs[0].equals(relayedAddrFetched)).to.eql(true)
  })

  it('fails to dial if resolve fails and there are no addresses to dial', async () => {
    const remoteId = remoteLibp2p.peerId.toB58String()
    const dialAddr = new Multiaddr(`/dnsaddr/remote.libp2p.io/p2p/${remoteId}`)

    // Stub resolver
    const stubResolve = sinon.stub(Resolver.prototype, 'resolveTxt')
    stubResolve.returns(Promise.reject(new Error()))

    // Stub transport
    const transport = libp2p.transportManager._transports.get('WebSockets')
    const spy = sinon.spy(transport, 'dial')

    await expect(libp2p.dial(dialAddr))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.nested.property('.code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
    expect(spy.callCount).to.eql(0)
  })
})
