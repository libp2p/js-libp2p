/* eslint-env mocha */

import { generateKeyPair, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { contentRoutingSymbol } from '@libp2p/interface'
import { peerIdFromMultihash, peerIdFromPrivateKey } from '@libp2p/peer-id'
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
    const otherPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const key = await node.getPublicKey(otherPeer)

    expect(otherPeer.publicKey.equals(key)).to.be.true()
  })

  it('should get key from the peerstore', async () => {
    const otherPeer = peerIdFromPrivateKey(await generateKeyPair('RSA', 512))

    if (otherPeer.publicKey == null) {
      throw new Error('Public key was missing')
    }

    await node.peerStore.patch(otherPeer, {
      publicKey: otherPeer.publicKey
    })

    const key = await node.getPublicKey(otherPeer)

    expect(otherPeer.publicKey.equals(key)).to.be.true()
  })

  it('should query content routing when the key is not in the keystore', async () => {
    const otherPeer = peerIdFromPrivateKey(await generateKeyPair('RSA', 512))

    router.get.callsFake(async () => {
      if (otherPeer.publicKey == null) {
        throw new Error('Public key was missing')
      }

      return Promise.resolve(publicKeyToProtobuf(otherPeer.publicKey))
    })

    // create a copy of the RSA key, this will not have the public key
    const otherPeerWithoutPublicKey = peerIdFromMultihash(otherPeer.toMultihash())
    expect(otherPeerWithoutPublicKey).to.have.property('publicKey', undefined)

    const key = await node.getPublicKey(otherPeerWithoutPublicKey)

    expect(otherPeer.publicKey?.equals(key)).to.be.true()
    expect(router.get.called).to.be.true('routing was not queried')
  })
})
