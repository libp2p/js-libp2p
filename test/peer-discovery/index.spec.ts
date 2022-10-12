/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { createBaseOptions } from '../utils/base-options.browser.js'
import { createPeerId } from '../utils/creators/peer.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'
import type { Startable } from '@libp2p/interfaces/startable'
import { stubInterface } from 'ts-sinon'
import type { PeerDiscovery } from '@libp2p/interface-peer-discovery'

describe('peer discovery', () => {
  describe('basic functions', () => {
    let peerId: PeerId
    let libp2p: Libp2pNode

    before(async () => {
      peerId = await createPeerId()
    })

    afterEach(async () => {
      if (libp2p != null) {
        await libp2p.stop()
      }

      sinon.reset()
    })

    it('should start/stop startable discovery on libp2p start/stop', async () => {
      const discovery = stubInterface<PeerDiscovery & Startable>()

      libp2p = await createLibp2pNode(createBaseOptions({
        peerId,
        peerDiscovery: [
          () => discovery
        ]
      }))

      await libp2p.start()
      expect(discovery.start.calledOnce).to.be.true()
      expect(discovery.stop.called).to.be.false()

      await libp2p.stop()
      expect(discovery.start.calledOnce).to.be.true()
      expect(discovery.stop.calledOnce).to.be.true()
    })
  })
})
