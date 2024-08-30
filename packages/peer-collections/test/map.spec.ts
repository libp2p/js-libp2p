import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromMultihash, peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { PeerMap } from '../src/index.js'

describe('peer-map', () => {
  it('should return a map', async () => {
    const map = new PeerMap<number>()
    const value = 5
    const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    map.set(peer, value)

    const peer2 = peerIdFromMultihash(peer.toMultihash())

    expect(map.get(peer2)).to.equal(value)
  })

  it('should create a map with contents', async () => {
    const map1 = new PeerMap<number>()
    const value = 5
    const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    map1.set(peer, value)

    const map2 = new PeerMap<number>(map1)

    expect(map2.get(peer)).to.equal(value)
  })
})
