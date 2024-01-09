/* eslint-env mocha */

import { contentRoutingSymbol } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { createEd25519PeerId, createRSAPeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { createLibp2p } from '../../src/index.js'
import type { ContentRouting, ContentRoutingProvider, Libp2p } from '@libp2p/interface'
import type { StubbedInstance } from 'sinon-ts'

describe('getPublicKey', () => {
  let node: Libp2p
  let router: StubbedInstance<ContentRouting & ContentRoutingProvider>

  beforeEach(async () => {
    router = stubInterface<ContentRouting & ContentRoutingProvider>()
    router[contentRoutingSymbol] = router

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
    const otherPeer = await createEd25519PeerId()

    const key = await node.getPublicKey(otherPeer)

    expect(otherPeer.publicKey).to.equalBytes(key)
  })

  it('should get key from the peerstore', async () => {
    const otherPeer = await createRSAPeerId()

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
    const otherPeer = await createRSAPeerId()

    router.get.callsFake(async () => {
      if (otherPeer.publicKey == null) {
        throw new Error('Public key was missing')
      }

      return Promise.resolve(otherPeer.publicKey)
    })

    // create a copy of the RSA key, this will not have the public key
    const otherPeerWithoutPublicKey = peerIdFromString(otherPeer.toString())
    expect(otherPeerWithoutPublicKey).to.have.property('publicKey', undefined)

    const key = await node.getPublicKey(otherPeerWithoutPublicKey)

    expect(otherPeer.publicKey).to.equalBytes(key)
    expect(router.get.called).to.be.true('routing was not queried')
  })
})
