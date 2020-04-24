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

const Libp2p = require('../../src')
const baseOptions = require('../utils/base-options')
const { createPeerInfo } = require('../utils/creators/peer')

describe('peer discovery scenarios', () => {
  let peerInfo, remotePeerInfo1, remotePeerInfo2
  let libp2p

  before(async () => {
    [peerInfo, remotePeerInfo1, remotePeerInfo2] = await createPeerInfo({ number: 3 })

    peerInfo.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
    remotePeerInfo1.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
    remotePeerInfo2.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/0'))
  })

  afterEach(async () => {
    libp2p && await libp2p.stop()
  })
  it('should ignore self on discovery', async () => {
    libp2p = new Libp2p(mergeOptions(baseOptions, {
      peerInfo,
      modules: {
        peerDiscovery: [MulticastDNS]
      }
    }))

    await libp2p.start()
    const discoverySpy = sinon.spy()
    libp2p.on('peer:discovery', discoverySpy)
    libp2p._discovery.get('mdns').emit('peer', libp2p.peerInfo)

    expect(discoverySpy.called).to.eql(false)
  })

  it('bootstrap should discover all peers in the list', async () => {
    const deferred = defer()

    const bootstrappers = [
      ...remotePeerInfo1.multiaddrs.toArray().map((ma) => `${ma}/p2p/${remotePeerInfo1.id.toB58String()}`),
      ...remotePeerInfo2.multiaddrs.toArray().map((ma) => `${ma}/p2p/${remotePeerInfo2.id.toB58String()}`)
    ]

    libp2p = new Libp2p(mergeOptions(baseOptions, {
      peerInfo,
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
      remotePeerInfo1.id.toB58String(),
      remotePeerInfo2.id.toB58String()
    ])

    libp2p.on('peer:discovery', (peerInfo) => {
      expectedPeers.delete(peerInfo.id.toB58String())
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

    const getConfig = (peerInfo) => mergeOptions(baseOptions, {
      peerInfo,
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
            serviceTag: crypto.randomBytes(10).toString('hex')
          }
        }
      }
    })

    libp2p = new Libp2p(getConfig(peerInfo))
    const remoteLibp2p1 = new Libp2p(getConfig(remotePeerInfo1))
    const remoteLibp2p2 = new Libp2p(getConfig(remotePeerInfo2))

    const expectedPeers = new Set([
      remotePeerInfo1.id.toB58String(),
      remotePeerInfo2.id.toB58String()
    ])

    libp2p.on('peer:discovery', (peerInfo) => {
      expectedPeers.delete(peerInfo.id.toB58String())
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

    const getConfig = (peerInfo) => mergeOptions(baseOptions, {
      peerInfo,
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

    const localConfig = getConfig(peerInfo)
    // Only run random walk on our local node
    localConfig.config.dht.randomWalk.enabled = true
    libp2p = new Libp2p(localConfig)

    const remoteLibp2p1 = new Libp2p(getConfig(remotePeerInfo1))
    const remoteLibp2p2 = new Libp2p(getConfig(remotePeerInfo2))

    libp2p.on('peer:discovery', (peerInfo) => {
      if (peerInfo.id.toB58String() === remotePeerInfo2.id.toB58String()) {
        libp2p.removeAllListeners('peer:discovery')
        deferred.resolve()
      }
    })

    await Promise.all([
      libp2p.start(),
      remoteLibp2p1.start(),
      remoteLibp2p2.start()
    ])

    // Topology:
    // A -> B
    // C -> B
    await Promise.all([
      libp2p.dial(remotePeerInfo1),
      remoteLibp2p2.dial(remotePeerInfo1)
    ])

    await deferred.promise
    return Promise.all([
      remoteLibp2p1.stop(),
      remoteLibp2p2.stop()
    ])
  })
})
