/* eslint-env mocha */

import { yamux } from '@chainsafe/libp2p-yamux'
import { stop } from '@libp2p/interface'
import { memory } from '@libp2p/memory'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

describe('resolver', () => {
  let dialer: Libp2p
  let listener: Libp2p
  let resolver: sinon.SinonStub<[Multiaddr], Promise<string[]>>

  beforeEach(async () => {
    resolver = sinon.stub<[Multiaddr], Promise<string[]>>();

    [dialer, listener] = await Promise.all([
      createLibp2p({
        transports: [
          memory()
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
        ]
      }),
      createLibp2p({
        addresses: {
          listen: ['/memory/location']
        },
        transports: [
          memory()
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
        ]
      })
    ])
  })

  afterEach(async () => {
    sinon.restore()

    await stop(dialer, listener)
  })

  it('should use the dnsaddr resolver to resolve a dnsaddr address', async () => {
    const dialAddr = multiaddr(`/dnsaddr/remote.libp2p.io/p2p/${listener.peerId}`)

    // resolver stub
    resolver.withArgs(dialAddr).resolves(listener.getMultiaddrs().map(ma => ma.toString()))

    // dial with resolved address
    const connection = await dialer.dial(dialAddr)
    expect(connection).to.exist()
    expect(connection.remoteAddr.equals(listener.getMultiaddrs()[0]))
  })

  it('fails to dial if resolve fails and there are no addresses to dial', async () => {
    const dialAddr = multiaddr(`/dnsaddr/remote.libp2p.io/p2p/${listener.peerId}`)
    const err = new Error()

    // Stub resolver
    resolver.rejects(err)

    await expect(dialer.dial(dialAddr))
      .to.eventually.be.rejectedWith(err)
  })
})
