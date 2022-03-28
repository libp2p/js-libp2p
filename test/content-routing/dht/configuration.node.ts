/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { createLibp2p, Libp2p } from '../../../src/index.js'
import { createSubsystemOptions } from './utils.js'

describe('DHT subsystem is configurable', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    if (libp2p != null) {
      await libp2p.stop()
    }
  })

  it('should not exist if no module is provided', async () => {
    libp2p = await createLibp2p(createSubsystemOptions({
      dht: undefined
    }))
    expect(libp2p.dht).to.not.exist()
  })

  it('should exist if the module is provided', async () => {
    libp2p = await createLibp2p(createSubsystemOptions())
    expect(libp2p.dht).to.exist()
  })
})
