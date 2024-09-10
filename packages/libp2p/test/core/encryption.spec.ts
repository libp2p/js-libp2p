/* eslint-env mocha */

import { plaintext } from '@libp2p/plaintext'
import { webSockets } from '@libp2p/websockets'
import { createLibp2p, type Libp2pOptions } from '../../src/index.js'

describe('Connection encryption configuration', () => {
  it('can be created', async () => {
    const config: Libp2pOptions = {
      start: false,
      transports: [
        webSockets()
      ],
      connectionEncrypters: [
        plaintext()
      ]
    }
    await createLibp2p(config)
  })
})
