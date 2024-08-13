/* eslint-env mocha */

import { plaintext } from '@libp2p/plaintext'
import { tcp } from '@libp2p/tcp'
import { expect } from 'aegir/chai'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p } from '@libp2p/interface'

const listenAddr = '/ip4/0.0.0.0/tcp/0'

describe('status', () => {
  let libp2p: Libp2p

  after(async () => {
    await libp2p.stop()
  })

  it('should have status', async () => {
    libp2p = await createLibp2p({
      start: false,
      addresses: {
        listen: [listenAddr]
      },
      transports: [
        tcp()
      ],
      connectionEncryption: [
        plaintext()
      ]
    })

    expect(libp2p).to.have.property('status', 'stopped')

    const startP = libp2p.start()

    expect(libp2p).to.have.property('status', 'starting')

    await startP

    expect(libp2p).to.have.property('status', 'started')

    const stopP = libp2p.stop()

    expect(libp2p).to.have.property('status', 'stopping')

    await stopP

    expect(libp2p).to.have.property('status', 'stopped')
  })
})
