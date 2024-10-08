import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromMultihash, peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import { PeerList } from '../src/index.js'

describe('peer-list', () => {
  it('should return a list', async () => {
    const list = new PeerList()
    const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    list.push(peer)

    const peer2 = peerIdFromMultihash(peer.toMultihash())

    expect(list.indexOf(peer2)).to.equal(0)
  })

  it('should create a list with PeerList contents', async () => {
    const list1 = new PeerList()
    const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    list1.push(peer)

    const list2 = new PeerList(list1)

    expect(list2.indexOf(peer)).to.equal(0)
  })

  it('should create a list with Array contents', async () => {
    const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const list = new PeerList([peer])

    expect(list.indexOf(peer)).to.equal(0)
  })
})
