/* eslint-env mocha */

import { yamux } from '@chainsafe/libp2p-yamux'
import { RELAY_V2_HOP_CODEC } from '@libp2p/circuit-relay-v2'
import { circuitRelayServer, type CircuitRelayService, circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { identify } from '@libp2p/identify'
import { mockConnection, mockConnectionGater, mockDuplex, mockMultiaddrConnection } from '@libp2p/interface-compliance-tests/mocks'
import { mplex } from '@libp2p/mplex'
import { peerIdFromString, peerIdFromPrivateKey } from '@libp2p/peer-id'
import { plaintext } from '@libp2p/plaintext'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import sinon from 'sinon'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p, PeerId, Transport } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

const relayAddr = multiaddr(process.env.RELAY_MULTIADDR)

const relayedAddr = (peerId: PeerId): string => `${relayAddr.toString()}/p2p-circuit/p2p/${peerId.toString()}`

const getDnsRelayedAddrStub = (peerId: PeerId): string[] => [
  `${relayedAddr(peerId)}`
]

describe('dialing (resolvable addresses)', () => {
  let libp2p: Libp2p
  let remoteLibp2p: Libp2p<{ relay: CircuitRelayService }>
  let resolver: sinon.SinonStub<[Multiaddr], Promise<string[]>>

  beforeEach(async () => {
    resolver = sinon.stub<[Multiaddr], Promise<string[]>>();

    [libp2p, remoteLibp2p] = await Promise.all([
      createLibp2p({
        addresses: {
          listen: [`${relayAddr.toString()}/p2p-circuit`]
        },
        transports: [
          circuitRelayTransport(),
          webSockets({
            filter: filters.all
          })
        ],
        streamMuxers: [
          yamux(),
          mplex()
        ],
        connectionManager: {
          resolvers: {
            dnsaddr: resolver
          }
        },
        connectionEncrypters: [
          plaintext()
        ],
        connectionGater: mockConnectionGater(),
        services: {
          identify: identify()
        }
      }),
      createLibp2p({
        addresses: {
          listen: [`${relayAddr.toString()}/p2p-circuit`]
        },
        transports: [
          circuitRelayTransport(),
          webSockets({
            filter: filters.all
          })
        ],
        streamMuxers: [
          yamux(),
          mplex()
        ],
        connectionManager: {
          resolvers: {
            dnsaddr: resolver
          }
        },
        connectionEncrypters: [
          plaintext()
        ],
        services: {
          relay: circuitRelayServer(),
          identify: identify()
        },
        connectionGater: mockConnectionGater()
      })
    ])

    await Promise.all([
      libp2p.start(),
      remoteLibp2p.start()
    ])
  })

  afterEach(async () => {
    sinon.restore()

    await Promise.all([libp2p, remoteLibp2p].map(async n => {
      if (n != null) {
        await n.stop()
      }
    }))
  })

  it('resolves dnsaddr to ws local address', async () => {
    const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    // ensure remote libp2p creates reservation on relay
    await remoteLibp2p.peerStore.merge(peerId, {
      protocols: [RELAY_V2_HOP_CODEC]
    })
    const remoteId = remoteLibp2p.peerId
    const dialAddr = multiaddr(`/dnsaddr/remote.libp2p.io/p2p/${remoteId.toString()}`)
    const relayedAddrFetched = multiaddr(relayedAddr(remoteId))

    // Transport spy
    const transport = getTransport(libp2p, '@libp2p/circuit-relay-v2-transport')
    const transportDialSpy = sinon.spy(transport, 'dial')

    // Resolver stub
    resolver.onCall(0).returns(Promise.resolve(getDnsRelayedAddrStub(remoteId)))

    // Dial with address resolve
    const connection = await libp2p.dial(dialAddr)
    expect(connection).to.exist()
    expect(connection.remoteAddr.equals(relayedAddrFetched))

    const dialArgs = transportDialSpy.firstCall.args
    expect(dialArgs[0].equals(relayedAddrFetched)).to.eql(true)
  })

  // TODO: Temporary solution does not resolve dns4/dns6
  // Resolver just returns the received multiaddrs
  it('stops recursive resolve if finds dns4/dns6 and dials it', async () => {
    const remoteId = remoteLibp2p.peerId
    const dialAddr = multiaddr(`/dnsaddr/remote.libp2p.io/p2p/${remoteId.toString()}`)

    // Stub resolver
    const dnsMa = multiaddr(`/dns4/ams-1.remote.libp2p.io/tcp/443/wss/p2p/${remoteId.toString()}`)
    resolver.returns(Promise.resolve([
      `${dnsMa.toString()}`
    ]))

    const deferred = pDefer()

    // Stub transport
    const transport = getTransport(libp2p, '@libp2p/websockets')
    const stubTransport = sinon.stub(transport, 'dial')
    stubTransport.callsFake(async (multiaddr) => {
      expect(multiaddr.equals(dnsMa)).to.equal(true)

      deferred.resolve()

      return mockConnection(mockMultiaddrConnection(mockDuplex(), peerIdFromString(multiaddr.getPeerId() ?? '')))
    })

    void libp2p.dial(dialAddr)

    await deferred.promise
  })

  it('fails to dial if resolve fails and there are no addresses to dial', async () => {
    const remoteId = remoteLibp2p.peerId
    const dialAddr = multiaddr(`/dnsaddr/remote.libp2p.io/p2p/${remoteId.toString()}`)
    const err = new Error()

    // Stub resolver
    resolver.returns(Promise.reject(err))

    await expect(libp2p.dial(dialAddr))
      .to.eventually.be.rejectedWith(err)
  })
})

function getTransport (libp2p: any, tag: string): Transport {
  const transport = libp2p.components.transportManager.getTransports().find((t: any) => {
    return t[Symbol.toStringTag] === tag
  })

  if (transport != null) {
    return transport
  }

  throw new Error(`No transport found for ${tag}`)
}
