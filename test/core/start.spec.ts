/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { webSockets } from '@libp2p/websockets'
import { plaintext } from '../../src/insecure/index.js'
import { createLibp2p, Libp2p } from '../../src/index.js'

describe('start', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('it should start by default', async () => {
    libp2p = await createLibp2p({
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    expect(libp2p.isStarted()).to.be.true()
  })

  it('it should allow overriding', async () => {
    libp2p = await createLibp2p({
      start: false,
      transports: [
        webSockets()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    expect(libp2p.isStarted()).to.be.false()

    await libp2p.start()

    expect(libp2p.isStarted()).to.be.true()
  })
})
