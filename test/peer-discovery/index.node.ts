/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import defer from 'p-defer'
import { Bootstrap } from '@libp2p/bootstrap'
import { randomBytes } from '@libp2p/crypto'
import { KadDHT } from '@libp2p/kad-dht'
import { MulticastDNS } from '@libp2p/mdns'
import { Multiaddr } from '@multiformats/multiaddr'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { createBaseOptions } from '../utils/base-options.js'
import { createPeerId } from '../utils/creators/peer.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'
import { CustomEvent } from '@libp2p/interfaces'
import type { PeerInfo } from '@libp2p/interfaces/peer-info'

const listenAddr = new Multiaddr('/ip4/127.0.0.1/tcp/0')

describe('peer discovery scenarios', () => {
  let peerId: PeerId, remotePeerId1: PeerId, remotePeerId2: PeerId
  let libp2p: Libp2pNode

  before(async () => {
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
    libp2p = await createLibp2pNode(createBaseOptions({
      peerId,
      peerDiscovery: [
        new MulticastDNS()
      ]
    }))

    await libp2p.start()
    const discoverySpy = sinon.spy()
    libp2p.addEventListener('peer:discovery', discoverySpy)
    libp2p.onDiscoveryPeer(new CustomEvent<PeerInfo>('peer', {
      detail: {
        id: libp2p.peerId,
        multiaddrs: [],
        protocols: []
      }
    }))

    expect(discoverySpy.called).to.eql(false)
  })

  it('bootstrap should discover all peers in the list', async () => {
    const deferred = defer()

    const bootstrappers = [
      `${listenAddr.toString()}/p2p/${remotePeerId1.toString()}`,
      `${listenAddr.toString()}/p2p/${remotePeerId2.toString()}`
    ]

    libp2p = await createLibp2pNode(createBaseOptions({
      peerId,
      addresses: {
        listen: [
          listenAddr.toString()
        ]
      },
      connectionManager: {
        autoDial: false
      },
      peerDiscovery: [
        new Bootstrap({
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

    const getConfig = (peerId: PeerId) => createBaseOptions({
      peerId,
      addresses: {
        listen: [
          listenAddr.toString()
        ]
      },
      peerDiscovery: [
        new MulticastDNS({
          interval: 200, // discover quickly
          serviceTag
        })
      ],
      connectionManager: {
        autoDial: false
      }
    })

    libp2p = await createLibp2pNode(getConfig(peerId))
    const remoteLibp2p1 = await createLibp2pNode(getConfig(remotePeerId1))
    const remoteLibp2p2 = await createLibp2pNode(getConfig(remotePeerId2))

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

    const getConfig = (peerId: PeerId) => createBaseOptions({
      peerId,
      addresses: {
        listen: [
          listenAddr.toString()
        ]
      },
      connectionManager: {
        autoDial: false
      },
      dht: new KadDHT()
    })

    const localConfig = getConfig(peerId)

    libp2p = await createLibp2pNode(localConfig)

    const remoteLibp2p1 = await createLibp2pNode(getConfig(remotePeerId1))
    const remoteLibp2p2 = await createLibp2pNode(getConfig(remotePeerId2))

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

    await libp2p.peerStore.addressBook.set(remotePeerId1, remoteLibp2p1.getMultiaddrs())
    await remoteLibp2p2.peerStore.addressBook.set(remotePeerId1, remoteLibp2p1.getMultiaddrs())

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
