/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { webSockets } from '@libp2p/websockets'
import { plaintext } from '../../src/insecure/index.js'
import { createLibp2p, Libp2pOptions } from '../../src/index.js'
import { codes as ErrorCodes } from '../../src/errors.js'
import { createPeerId } from '../utils/creators/peer.js'
import type { PeerId } from '@libp2p/interface-peer-id'

describe('Connection encryption configuration', () => {
  let peerId: PeerId

  before(async () => {
    peerId = await createPeerId()
  })

  it('is required', async () => {
    const config = {
      peerId,
      transports: [
        webSockets()
      ]
    }

    await expect(createLibp2p(config)).to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.CONN_ENCRYPTION_REQUIRED)
  })

  it('is required and needs at least one module', async () => {
    const config = {
      peerId,
      transports: [
        webSockets()
      ],
      connectionEncryption: []
    }
    await expect(createLibp2p(config)).to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.CONN_ENCRYPTION_REQUIRED)
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
