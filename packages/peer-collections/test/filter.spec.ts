import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { PeerFilter } from '../src/index.js'

describe('peer-filter', () => {
  it('should filter a peer', async () => {
    const filter = new PeerFilter(1024)
    const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    expect(filter.has(peer)).to.be.false()

    filter.add(peer)

    expect(filter.has(peer)).to.be.true()

    filter.remove(peer)

    expect(filter.has(peer)).to.be.false()
  })
})
