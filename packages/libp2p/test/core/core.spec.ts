/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p } from '@libp2p/interface'

describe('core', () => {
  let libp2p: Libp2p

  after(async () => {
    await libp2p.stop()
  })

  it('should start a minimal node', async () => {
    libp2p = await createLibp2p()

    expect(libp2p).to.have.property('status', 'started')
  })
})
