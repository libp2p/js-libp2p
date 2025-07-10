/* eslint-env mocha */

import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p } from '@libp2p/interface'

describe('status', () => {
  let libp2p: Libp2p

  after(async () => {
    await stop(libp2p)
  })

  it('should have status', async () => {
    libp2p = await createLibp2p({
      start: false
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
