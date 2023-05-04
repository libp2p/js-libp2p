/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import defer from 'p-defer'
import { bootstrap } from '@libp2p/bootstrap'
import { randomBytes } from '@libp2p/crypto'
import { kadDHT } from '@libp2p/kad-dht'
import { mdns } from '@libp2p/mdns'
import { multiaddr } from '@multiformats/multiaddr'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { createBaseOptions } from '../utils/base-options.js'
import { createPeerId } from '../utils/creators/peer.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { createLibp2p } from '../../src/index.js'
import { EventEmitter } from '@libp2p/interfaces/events'
import type { Libp2pOptions } from '../../src/index.js'
import type { Libp2p } from '@libp2p/interface-libp2p'
import type { DHT } from '@libp2p/interface-dht'
import type { PeerDiscovery, PeerDiscoveryEvents } from '@libp2p/interface-peer-discovery'
import { symbol } from '@libp2p/interface-peer-discovery'

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')

class TestPeerDiscovery extends EventEmitter<PeerDiscoveryEvents> implements PeerDiscovery {
  get [symbol] (): true {
    return true
  }

  get [Symbol.toStringTag] (): '@libp2p/test-peer-discovery' {
    return '@libp2p/test-peer-discovery'
  }
}

describe('peer discovery scenarios', () => {
  let peerId: PeerId
  let remotePeerId1: PeerId
  let remotePeerId2: PeerId
  let libp2p: Libp2p

  beforeEach(async () => {
    [peerId, remotePeerId1, remotePeerId2] = await Promise.all([
      createPeerId(),
      createPeerId(),
      createPeerId()
    ])
  })

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should ignore self on discovery', async () => {
    const discovery = new TestPeerDiscovery()

    libp2p = await createLibp2p(createBaseOptions({
      peerId,
      peerDiscovery: [
        () => discovery
      ]
    }))

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

    libp2p = await createLibp2p(createBaseOptions({
      peerId,
      addresses: {
        listen: [
          listenAddr.toString()
        ]
      },
      peerDiscovery: [
        bootstrap({
          list: bootstrappers
        })
      ]
    }))

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

    return await deferred.promise
  })

  it('MulticastDNS should discover all peers on the local network', async () => {
    const deferred = defer()

    // use a random tag to prevent CI collision
    const serviceTag = `libp2p-test-${uint8ArrayToString(randomBytes(4), 'base16')}.local`

    const getConfig = (peerId: PeerId): Libp2pOptions => createBaseOptions({
      peerId,
      addresses: {
        listen: [
          listenAddr.toString()
        ]
      },
      peerDiscovery: [
        mdns({
          interval: 200, // discover quickly
          serviceTag
        })
      ]
    })

    libp2p = await createLibp2p(getConfig(peerId))
    const remoteLibp2p1 = await createLibp2p(getConfig(remotePeerId1))
    const remoteLibp2p2 = await createLibp2p(getConfig(remotePeerId2))

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

    await Promise.all([
      remoteLibp2p1.start(),
      remoteLibp2p2.start(),
      libp2p.start()
    ])

    await deferred.promise

    await remoteLibp2p1.stop()
    await remoteLibp2p2.stop()
  })

  it('kad-dht should discover other peers', async () => {
    const deferred = defer()

    const getConfig = (peerId: PeerId): Libp2pOptions<{ dht: DHT }> => createBaseOptions({
      peerId,
      addresses: {
        listen: [
          listenAddr.toString()
        ]
      },
      services: {
        dht: kadDHT()
      }
    })

    const localConfig = getConfig(peerId)

    libp2p = await createLibp2p(localConfig)

    const remoteLibp2p1 = await createLibp2p(getConfig(remotePeerId1))
    const remoteLibp2p2 = await createLibp2p(getConfig(remotePeerId2))

    libp2p.addEventListener('peer:discovery', (evt) => {
      const { id } = evt.detail

      if (id.equals(remotePeerId1)) {
        libp2p.removeEventListener('peer:discovery')
        deferred.resolve()
      }
    })

    await Promise.all([
      libp2p.start(),
      remoteLibp2p1.start(),
      remoteLibp2p2.start()
    ])

    await libp2p.peerStore.patch(remotePeerId1, {
      multiaddrs: remoteLibp2p1.getMultiaddrs()
    })
    await remoteLibp2p2.peerStore.patch(remotePeerId1, {
      multiaddrs: remoteLibp2p1.getMultiaddrs()
    })

    // Topology:
    // A -> B
    // C -> B
    await Promise.all([
      libp2p.dial(remotePeerId1),
      remoteLibp2p2.dial(remotePeerId1)
    ])

    await deferred.promise
    return await Promise.all([
      remoteLibp2p1.stop(),
      remoteLibp2p2.stop()
    ])
  })
})
