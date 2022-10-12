/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { webSockets } from '@libp2p/websockets'
import { plaintext } from '../../src/insecure/index.js'
import { createPeerId } from '../utils/creators/peer.js'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'
import type { Libp2pOptions } from '../../src/index.js'
import sinon from 'sinon'
import { kadDht } from '@libp2p/kad-dht'

describe('getPublicKey', () => {
  let libp2p: Libp2pNode

  beforeEach(async () => {
    const peerId = await createPeerId()
    const config: Libp2pOptions = {
      peerId,
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ],
      dht: kadDht()
    }
    libp2p = await createLibp2pNode(config)

    await libp2p.start()
  })

  afterEach(async () => {
    await libp2p.stop()
  })

  it('should extract embedded public key', async () => {
    const otherPeer = await createPeerId()

    const key = await libp2p.getPublicKey(otherPeer)

    expect(otherPeer.publicKey).to.equalBytes(key)
  })

  it('should get key from the keystore', async () => {
    const otherPeer = await createPeerId({ opts: { type: 'rsa' } })

    if (otherPeer.publicKey == null) {
      throw new Error('Public key was missing')
    }

    await libp2p.peerStore.keyBook.set(otherPeer, otherPeer.publicKey)

    const key = await libp2p.getPublicKey(otherPeer)

    expect(otherPeer.publicKey).to.equalBytes(key)
  })

  it('should query the DHT when the key is not in the keystore', async () => {
    const otherPeer = await createPeerId({ opts: { type: 'rsa' } })

    if (otherPeer.publicKey == null) {
      throw new Error('Public key was missing')
    }

    if (libp2p.dht == null) {
      throw new Error('DHT was not configured')
    }

    libp2p.dht.get = sinon.stub().returns([{
      name: 'VALUE',
      value: otherPeer.publicKey
    }])

    const key = await libp2p.getPublicKey(otherPeer)

    expect(otherPeer.publicKey).to.equalBytes(key)
  })
})
