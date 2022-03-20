/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import sinon from 'sinon'
import defer from 'p-defer'
import { Multiaddr } from '@multiformats/multiaddr'
import { createBaseOptions } from '../utils/base-options.browser.js'
import { createPeerId } from '../utils/creators/peer.js'
import { isPeerId, PeerId } from '@libp2p/interfaces/peer-id'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'
import { mockConnection, mockDuplex, mockMultiaddrConnection } from '@libp2p/interface-compliance-tests/mocks'

describe('peer discovery', () => {
  describe('basic functions', () => {
    let peerId: PeerId
    let remotePeerId: PeerId
    let libp2p: Libp2pNode

    before(async () => {
      [peerId, remotePeerId] = await Promise.all([
        createPeerId(),
        createPeerId()
      ])
    })

    afterEach(async () => {
      if (libp2p != null) {
        await libp2p.stop()
      }

      sinon.reset()
    })

    it('should dial known peers on startup below the minConnections watermark', async () => {
      libp2p = await createLibp2pNode(createBaseOptions({
        peerId,
        connectionManager: {
          minConnections: 2
        }
      }))

      await libp2p.peerStore.addressBook.set(remotePeerId, [new Multiaddr('/ip4/165.1.1.1/tcp/80')])

      const deferred = defer()
      sinon.stub(libp2p.components.getDialer(), 'dial').callsFake(async (id) => {
        if (!isPeerId(id)) {
          throw new Error('Tried to dial something that was not a peer ID')
        }

        if (!remotePeerId.equals(id)) {
          throw new Error('Tried to dial wrong peer ID')
        }

        deferred.resolve()
        return mockConnection(mockMultiaddrConnection(mockDuplex(), id))
      })

      const spy = sinon.spy()
      libp2p.addEventListener('peer:discovery', spy)

      await libp2p.start()
      await deferred.promise

      expect(spy.calledOnce).to.equal(true)
      expect(spy.getCall(0).args[0].detail.id.toString()).to.equal(remotePeerId.toString())
    })

    it('should stop discovery on libp2p start/stop', async () => {
      let started = 0
      let stopped = 0

      class MockDiscovery {
        static tag = 'mock'
        start () {
          started++
        }

        stop () {
          stopped++
        }

        addEventListener () {}
        removeEventListener () {}
      }

      libp2p = await createLibp2pNode(createBaseOptions({
        peerId,
        peerDiscovery: [
          new MockDiscovery()
        ]
      }))

      await libp2p.start()
      expect(started).to.equal(1)
      expect(stopped).to.equal(0)
      await libp2p.stop()
      expect(started).to.equal(1)
      expect(stopped).to.equal(1)
    })
  })
})
