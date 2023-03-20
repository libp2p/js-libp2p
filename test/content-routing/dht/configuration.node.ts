/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { createLibp2p, Libp2p } from '../../../src/index.js'
import { createSubsystemOptions } from './utils.js'

describe('DHT subsystem is configurable', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should throw if no module is provided', async () => {
    libp2p = await createLibp2p(createSubsystemOptions({
      dht: undefined
    }))
    await libp2p.start()
    await expect(libp2p.dht.getMode()).to.eventually.be.rejected()
  })

  it('should not throw if the module is provided', async () => {
    libp2p = await createLibp2p(createSubsystemOptions())
    await libp2p.start()
    await expect(libp2p.dht.getMode()).to.eventually.equal('client')
  })
})
