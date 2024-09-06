/* eslint-env mocha */

import { TypedEventEmitter } from '@libp2p/interface'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { createLibp2p } from '../../src/index.js'
import type { PeerDiscovery, PeerDiscoveryEvents, Startable, Libp2p } from '@libp2p/interface'

describe('peer discovery', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }

    sinon.reset()
  })

  it('should start/stop startable discovery on libp2p start/stop', async () => {
    const discovery = stubInterface<PeerDiscovery & Startable>()

    libp2p = await createLibp2p({
      peerDiscovery: [
        () => discovery
      ]
    })

    await libp2p.start()
    expect(discovery.start.calledOnce).to.be.true()
    expect(discovery.stop.called).to.be.false()

    await libp2p.stop()
    expect(discovery.start.calledOnce).to.be.true()
    expect(discovery.stop.calledOnce).to.be.true()
  })

  it('should ignore self on discovery', async () => {
    const discovery = new TypedEventEmitter<PeerDiscoveryEvents>()

    libp2p = await createLibp2p({
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
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/2341')
        ]
      }
    })

    expect(discoverySpy.called).to.eql(false)
  })
})
