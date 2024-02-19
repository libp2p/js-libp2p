/* eslint-env mocha */

import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { plaintext } from '@libp2p/plaintext'
import { webSockets } from '@libp2p/websockets'
import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2pNode, type Libp2pNode } from '../../src/libp2p.js'

describe('Consume peer record', () => {
  let libp2p: Libp2pNode

  beforeEach(async () => {
    const peerId = await createEd25519PeerId()
    libp2p = await createLibp2pNode({
      peerId,
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })
  })

  afterEach(async () => {
    await libp2p.stop()
  })

  it('should update addresses when observed addrs are confirmed', async () => {
    let done: () => void

    libp2p.peerStore.patch = async () => {
      done()
      return {} as any
    }

    const p = new Promise<void>(resolve => {
      done = resolve
    })

    await libp2p.start()

    libp2p.components.addressManager.confirmObservedAddr(multiaddr('/ip4/123.123.123.123/tcp/3983'))

    await p

    await libp2p.stop()
  })
})
