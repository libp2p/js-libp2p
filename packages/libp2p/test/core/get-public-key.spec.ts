/* eslint-env mocha */

import { contentRoutingSymbol } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { createLibp2p } from '../../src/index.js'
import { createPeerId } from '../fixtures/creators/peer.js'
import type { ContentRouting, ContentRoutingProvider, Libp2p } from '@libp2p/interface'
import type { StubbedInstance } from 'sinon-ts'

describe('getPublicKey', () => {
  let node: Libp2p
  let router: StubbedInstance<ContentRouting & ContentRoutingProvider>

  beforeEach(async () => {
    router = stubInterface<ContentRouting & ContentRoutingProvider>({
      [contentRoutingSymbol]: router
    })

    node = await createLibp2p({
      services: {
        router: () => router
      }
    })
  })

  afterEach(async () => {
    if (node != null) {
      await node.stop()
    }
  })

  it('should extract embedded public key', async () => {
    const otherPeer = await createPeerId()

    const key = await node.getPublicKey(otherPeer)

    expect(otherPeer.publicKey).to.equalBytes(key)
  })

  it('should get key from the peerstore', async () => {
    const otherPeer = await createPeerId({ opts: { type: 'rsa' } })

    if (otherPeer.publicKey == null) {
      throw new Error('Public key was missing')
    }

    await node.peerStore.patch(otherPeer, {
      publicKey: otherPeer.publicKey
    })

    const key = await node.getPublicKey(otherPeer)

    expect(otherPeer.publicKey).to.equalBytes(key)
  })

  it('should query content routing when the key is not in the keystore', async () => {
    const otherPeer = await createPeerId({ opts: { type: 'rsa' } })

    if (otherPeer.publicKey == null) {
      throw new Error('Public key was missing')
    }

    router.get.resolves(otherPeer.publicKey)

    const key = await node.getPublicKey(otherPeer)

    expect(otherPeer.publicKey).to.equalBytes(key)
  })
})
