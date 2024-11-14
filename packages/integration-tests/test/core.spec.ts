import { stop } from '@libp2p/interface'
import { memory } from '@libp2p/memory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import type { Libp2p } from '@libp2p/interface'

describe('core', () => {
  let libp2p: Libp2p

  afterEach(async () => {
    await stop(libp2p)
  })

  it('should say an address is dialable if a transport is configured', async () => {
    libp2p = await createLibp2p({
      transports: [
        memory()
      ]
    })

    const ma = multiaddr('/memory/address-1')

    await expect(libp2p.isDialable(ma)).to.eventually.be.true()
  })

  it('should say an address is not dialable if a transport is not configured', async () => {
    libp2p = await createLibp2p({
      transports: [
        memory()
      ]
    })

    const ma = multiaddr('/ip4/123.123.123.123/tcp/1234')

    await expect(libp2p.isDialable(ma)).to.eventually.be.false()
  })
})
