import { expect } from 'aegir/chai'
import { PeerMap } from '../src/index.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { peerIdFromBytes } from '@libp2p/peer-id'

describe('peer-map', () => {
  it('should return a map', async () => {
    const map = new PeerMap<number>()
    const value = 5
    const peer = await createEd25519PeerId()

    map.set(peer, value)

    const peer2 = peerIdFromBytes(peer.toBytes())

    expect(map.get(peer2)).to.equal(value)
  })

  it('should create a map with contents', async () => {
    const map1 = new PeerMap<number>()
    const value = 5
    const peer = await createEd25519PeerId()

    map1.set(peer, value)

    const map2 = new PeerMap<number>(map1)

    expect(map2.get(peer)).to.equal(value)
  })
})
