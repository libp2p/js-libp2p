import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2p } from 'libp2p'
import { createBaseOptions } from './fixtures/base-options.js'
import type { Libp2p } from '@libp2p/interface'

describe('lifecycle', () => {
  let peer: Libp2p

  afterEach(async () => {
    await peer?.stop()
  })

  it('can dial a node after restarting', async () => {
    const ma = multiaddr(process.env.RELAY_MULTIADDR)

    peer = await createLibp2p(createBaseOptions())

    await peer.dial(ma)

    // stop and restart peer
    await peer.stop()
    await peer.start()

    // once started, attempt to dial again
    await peer.dial(ma)
  })
})
