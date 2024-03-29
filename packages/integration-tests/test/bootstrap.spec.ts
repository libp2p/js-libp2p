/* eslint-env mocha */

import { bootstrap } from '@libp2p/bootstrap'
import { TypedEventEmitter, peerDiscoverySymbol } from '@libp2p/interface'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { webSockets } from '@libp2p/websockets'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import defer from 'p-defer'
import sinon from 'sinon'
import type { Libp2p, PeerDiscovery, PeerDiscoveryEvents, PeerId } from '@libp2p/interface'

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0/ws')

class TestPeerDiscovery extends TypedEventEmitter<PeerDiscoveryEvents> implements PeerDiscovery {
  get [peerDiscoverySymbol] (): PeerDiscovery {
    return this
  }

  readonly [Symbol.toStringTag] = '@libp2p/test-peer-discovery'
}

describe('bootstrap', () => {
  let peerId: PeerId
  let remotePeerId1: PeerId
  let remotePeerId2: PeerId
  let libp2p: Libp2p

  beforeEach(async () => {
    [peerId, remotePeerId1, remotePeerId2] = await Promise.all([
      createEd25519PeerId(),
      createEd25519PeerId(),
      createEd25519PeerId()
    ])
  })

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should ignore self on discovery', async () => {
    const discovery = new TestPeerDiscovery()

    libp2p = await createLibp2p({
      peerId,
      peerDiscovery: [
        () => discovery
      ]
    })

    await libp2p.start()
    const discoverySpy = sinon.spy()
    libp2p.addEventListener('peer:discovery', discoverySpy)
    discovery.safeDispatchEvent('peer', {
      detail: {
        id: libp2p.peerId,
        multiaddrs: [],
        protocols: []
      }
    })

    expect(discoverySpy.called).to.eql(false)
  })

  it('bootstrap should discover all peers in the list', async () => {
    const deferred = defer()

    const bootstrappers = [
      `${listenAddr.toString()}/p2p/${remotePeerId1.toString()}`,
      `${listenAddr.toString()}/p2p/${remotePeerId2.toString()}`
    ]

    libp2p = await createLibp2p({
      transports: [
        webSockets()
      ],
      peerDiscovery: [
        bootstrap({
          list: bootstrappers
        })
      ]
    })

    const expectedPeers = new Set([
      remotePeerId1.toString(),
      remotePeerId2.toString()
    ])

    libp2p.addEventListener('peer:discovery', (evt) => {
      const { id } = evt.detail

      expectedPeers.delete(id.toString())
      if (expectedPeers.size === 0) {
        libp2p.removeEventListener('peer:discovery')
        deferred.resolve()
      }
    })

    await libp2p.start()

    return deferred.promise
  })
})
