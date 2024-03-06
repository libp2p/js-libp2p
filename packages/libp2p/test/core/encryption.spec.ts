/* eslint-env mocha */

import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { plaintext } from '@libp2p/plaintext'
import { webSockets } from '@libp2p/websockets'
import { createLibp2p, type Libp2pOptions } from '../../src/index.js'
import type { PeerId } from '@libp2p/interface'

describe('Connection encryption configuration', () => {
  let peerId: PeerId

  before(async () => {
    peerId = await createEd25519PeerId()
  })

  it('can be created', async () => {
    const config: Libp2pOptions = {
      peerId,
      start: false,
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    }
    await createLibp2p(config)
  })
})
