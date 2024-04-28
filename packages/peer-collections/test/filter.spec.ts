import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { PeerFilter } from '../src/index.js'

describe('peer-filter', () => {
  it('should filter a peer', async () => {
    const filter = new PeerFilter(1024)
    const peer = await createEd25519PeerId()

    expect(filter.has(peer)).to.be.false()

    filter.add(peer)

    expect(filter.has(peer)).to.be.true()
  })
})
