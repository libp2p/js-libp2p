/* eslint-env mocha */

import { plaintext } from '@libp2p/plaintext'
import { webSockets } from '@libp2p/websockets'
import { expect } from 'aegir/chai'
import { createLibp2p, type Libp2p } from '../../src/index.js'

describe('peer-id', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should create a PeerId if none is passed', async () => {
    libp2p = await createLibp2p({
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    expect(libp2p.peerId).to.be.ok()
  })
})
