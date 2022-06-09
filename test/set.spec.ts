import { expect } from 'aegir/chai'
import { PeerSet } from '../src/index.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { peerIdFromBytes } from '@libp2p/peer-id'
import type { PeerId } from '@libp2p/interfaces/peer-id'

describe('peer-set', () => {
  it('should return a set', async () => {
    const set = new PeerSet()
    const peer = await createEd25519PeerId()

    set.add(peer)

    const peer2 = peerIdFromBytes(peer.toBytes())

    expect(set.has(peer2)).to.be.true()
  })

  it('should create a set with PeerSet contents', async () => {
    const set1 = new PeerSet()
    const peer = await createEd25519PeerId()

    set1.add(peer)

    const set2 = new PeerSet(set1)

    expect(set2.has(peer)).to.be.true()
  })

  it('should create a set with Array contents', async () => {
    const peer = await createEd25519PeerId()
    const set = new PeerSet([peer])

    expect(set.has(peer)).to.be.true()
  })

  it('should create a set with Set contents', async () => {
    const peer = await createEd25519PeerId()
    const s = new Set<PeerId>()
    s.add(peer)
    const set = new PeerSet(s)

    expect(set.has(peer)).to.be.true()
  })
})
