/* eslint-env mocha */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { createBaseOptions } from '../utils/base-options.browser.js'
import { createPeerId } from '../utils/creators/peer.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'
import type { Startable } from '@libp2p/interfaces/startable'

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

    it('should stop discovery on libp2p start/stop', async () => {
      let started = 0
      let stopped = 0

      class MockDiscovery implements Startable {
        static tag = 'mock'

        started = false

        isStarted () {
          return this.started
        }

        start () {
          this.started = true
          started++
        }

        stop () {
          this.started = false
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
