/* eslint-env mocha */

import { WebSockets } from '@libp2p/websockets'
import { NOISE } from '@chainsafe/libp2p-noise'
import { createPeerId } from '../utils/creators/peer.js'
import { Multiaddr } from '@multiformats/multiaddr'
import { createLibp2pNode, Libp2pNode } from '../../src/libp2p.js'
import type { Libp2pOptions } from '../../src/index.js'

describe('Consume peer record', () => {
  let libp2p: Libp2pNode

  beforeEach(async () => {
    const peerId = await createPeerId()
    const config: Libp2pOptions = {
      peerId,
      transports: [
        new WebSockets()
      ],
      connectionEncryption: [
        NOISE
      ]
    }
    libp2p = await createLibp2pNode(config)
  })

  afterEach(async () => {
    await libp2p.stop()
  })

  it('should consume peer record when observed addrs are added', async () => {
    let done: () => void

    libp2p.components.getPeerStore().addressBook.consumePeerRecord = async () => {
      done()
      return true
    }

    const p = new Promise<void>(resolve => {
      done = resolve
    })

    await libp2p.start()

    libp2p.components.getAddressManager().addObservedAddr(new Multiaddr('/ip4/123.123.123.123/tcp/3983'))

    await p

    await libp2p.stop()
  })
})
