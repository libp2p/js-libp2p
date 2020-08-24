'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')
const defer = require('p-defer')
const mergeOptions = require('merge-options')

const Bootstrap = require('libp2p-bootstrap')
const crypto = require('libp2p-crypto')
const KadDht = require('libp2p-kad-dht')
const MulticastDNS = require('libp2p-mdns')
const multiaddr = require('multiaddr')
const uint8ArrayToString = require('uint8arrays/to-string')

const Libp2p = require('../../src')
const baseOptions = require('../utils/base-options')
const { createPeerId } = require('../utils/creators/peer')

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')

describe('peer discovery scenarios', () => {
  let peerId, remotePeerId1, remotePeerId2
  let libp2p

  before(async () => {
    [peerId, remotePeerId1, remotePeerId2] = await createPeerId({ number: 3 })
  })

  afterEach(async () => {
    libp2p && await libp2p.stop()
  })
  it('should ignore self on discovery', async () => {
    libp2p = new Libp2p(mergeOptions(baseOptions, {
      peerId,
      modules: {
        peerDiscovery: [MulticastDNS]
      }
    }))

    await libp2p.start()
    const discoverySpy = sinon.spy()
    libp2p.on('peer:discovery', discoverySpy)
    libp2p._discovery.get('mdns').emit('peer', { id: libp2p.peerId })

    expect(discoverySpy.called).to.eql(false)
  })

  it('bootstrap should discover all peers in the list', async () => {
    const deferred = defer()

    const bootstrappers = [
      `${listenAddr}/p2p/${remotePeerId1.toB58String()}`,
      `${listenAddr}/p2p/${remotePeerId2.toB58String()}`
    ]

    libp2p = new Libp2p(mergeOptions(baseOptions, {
      peerId,
      addresses: {
        listen: [listenAddr]
      },
      modules: {
        peerDiscovery: [Bootstrap]
      },
      config: {
        peerDiscovery: {
          autoDial: false,
          bootstrap: {
            enabled: true,
            list: bootstrappers
          }
        }
      }
    }))

    const expectedPeers = new Set([
      remotePeerId1.toB58String(),
      remotePeerId2.toB58String()
    ])

    libp2p.on('peer:discovery', (peerId) => {
      expectedPeers.delete(peerId.toB58String())
      if (expectedPeers.size === 0) {
        libp2p.removeAllListeners('peer:discovery')
        deferred.resolve()
      }
    })

    await libp2p.start()

    return deferred.promise
  })

  it('MulticastDNS should discover all peers on the local network', async () => {
    const deferred = defer()

    const getConfig = (peerId) => mergeOptions(baseOptions, {
      peerId,
      addresses: {
        listen: [listenAddr]
      },
      modules: {
        peerDiscovery: [MulticastDNS]
      },
      config: {
        peerDiscovery: {
          autoDial: false,
          mdns: {
            enabled: true,
            interval: 200, // discover quickly
            // use a random tag to prevent CI collision
            serviceTag: uint8ArrayToString(crypto.randomBytes(10), 'base16')
          }
        }
      }
    })

    libp2p = new Libp2p(getConfig(peerId))
    const remoteLibp2p1 = new Libp2p(getConfig(remotePeerId1))
    const remoteLibp2p2 = new Libp2p(getConfig(remotePeerId2))

    const expectedPeers = new Set([
      remotePeerId1.toB58String(),
      remotePeerId2.toB58String()
    ])

    libp2p.on('peer:discovery', (peerId) => {
      expectedPeers.delete(peerId.toB58String())
      if (expectedPeers.size === 0) {
        libp2p.removeAllListeners('peer:discovery')
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

    const getConfig = (peerId) => mergeOptions(baseOptions, {
      peerId,
      addresses: {
        listen: [listenAddr]
      },
      modules: {
        dht: KadDht
      },
      config: {
        peerDiscovery: {
          autoDial: false
        },
        dht: {
          randomWalk: {
            enabled: false,
            delay: 1000, // start the first query quickly
            interval: 10000,
            timeout: 5000
          },
          enabled: true
        }
      }
    })

    const localConfig = getConfig(peerId)
    // Only run random walk on our local node
    localConfig.config.dht.randomWalk.enabled = true
    libp2p = new Libp2p(localConfig)

    const remoteLibp2p1 = new Libp2p(getConfig(remotePeerId1))
    const remoteLibp2p2 = new Libp2p(getConfig(remotePeerId2))

    libp2p.on('peer:discovery', (peerId) => {
      if (peerId.toB58String() === remotePeerId1.toB58String()) {
        libp2p.removeAllListeners('peer:discovery')
        deferred.resolve()
      }
    })

    await Promise.all([
      libp2p.start(),
      remoteLibp2p1.start(),
      remoteLibp2p2.start()
    ])

    libp2p.peerStore.addressBook.set(remotePeerId1, remoteLibp2p1.multiaddrs)
    remoteLibp2p2.peerStore.addressBook.set(remotePeerId1, remoteLibp2p1.multiaddrs)

    // Topology:
    // A -> B
    // C -> B
    await Promise.all([
      libp2p.dial(remotePeerId1),
      remoteLibp2p2.dial(remotePeerId1)
    ])

    await deferred.promise
    return Promise.all([
      remoteLibp2p1.stop(),
      remoteLibp2p2.stop()
    ])
  })
})
