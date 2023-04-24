/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import { expect } from 'aegir/chai'
import { multiaddr } from '@multiformats/multiaddr'
import type { PeerId } from '@libp2p/interface-peer-id'
import { MemoryDatastore } from 'datastore-core/memory'
import { PersistentPeerStore } from '../src/index.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import delay from 'delay'
import { EventEmitter } from '@libp2p/interfaces/events'
import type { Libp2pEvents } from '@libp2p/interface-libp2p'

const addr1 = multiaddr('/ip4/127.0.0.1/tcp/8000')

describe('PersistentPeerStore', () => {
  let peerId: PeerId
  let otherPeerId: PeerId
  let peerStore: PersistentPeerStore
  let events: EventEmitter<Libp2pEvents>

  beforeEach(async () => {
    peerId = await createEd25519PeerId()
    otherPeerId = await createEd25519PeerId()
    events = new EventEmitter()
    peerStore = new PersistentPeerStore({ peerId, events, datastore: new MemoryDatastore() })
  })

  it('has an empty map of peers', async () => {
    const peers = await peerStore.all()
    expect(peers.length).to.equal(0)
  })

  describe('has', () => {
    it('has peer data', async () => {
      await expect(peerStore.has(otherPeerId)).to.eventually.be.false()
      await peerStore.save(otherPeerId, {
        multiaddrs: [
          addr1
        ]
      })
      await expect(peerStore.has(otherPeerId)).to.eventually.be.true()
    })
  })

  describe('delete', () => {
    it('deletes peer data', async () => {
      await expect(peerStore.has(otherPeerId)).to.eventually.be.false()
      await peerStore.save(otherPeerId, {
        multiaddrs: [
          addr1
        ]
      })
      await expect(peerStore.has(otherPeerId)).to.eventually.be.true()
      await peerStore.delete(otherPeerId)
      await expect(peerStore.has(otherPeerId)).to.eventually.be.false()
    })

    it('does not allow deleting the self peer', async () => {
      await expect(peerStore.has(peerId)).to.eventually.be.false()
      await peerStore.save(peerId, {
        multiaddrs: [
          addr1
        ]
      })

      await expect(peerStore.delete(peerId)).to.eventually.be.rejected()
        .with.property('code', 'ERR_INVALID_PARAMETERS')
    })
  })

  describe('tags', () => {
    it('tags a peer', async () => {
      const name = 'a-tag'
      const peer = await peerStore.save(otherPeerId, {
        tags: {
          [name]: {}
        }
      })

      expect(peer).to.have.property('tags')
        .that.deep.equals(new Map([[name, { value: 0 }]]), 'Peer did not contain tag')
    })

    it('tags a peer with a value', async () => {
      const name = 'a-tag'
      const value = 50
      const peer = await peerStore.save(peerId, {
        tags: {
          [name]: { value }
        }
      })

      expect(peer).to.have.property('tags')
        .that.deep.equals(new Map([[name, { value }]]), 'Peer did not contain tag with a value')
    })

    it('tags a peer with a valid value', async () => {
      const name = 'a-tag'

      await expect(peerStore.save(peerId, {
        tags: {
          [name]: { value: -1 }
        }
      }), 'PeerStore contain tag for peer where value was too small')
        .to.eventually.be.rejected().with.property('code', 'ERR_INVALID_PARAMETERS')

      await expect(peerStore.save(peerId, {
        tags: {
          [name]: { value: 101 }
        }
      }), 'PeerStore contain tag for peer where value was too large')
        .to.eventually.be.rejected().with.property('code', 'ERR_INVALID_PARAMETERS')

      await expect(peerStore.save(peerId, {
        tags: {
          [name]: { value: 5.5 }
        }
      }), 'PeerStore contain tag for peer where value was not an integer')
        .to.eventually.be.rejected().with.property('code', 'ERR_INVALID_PARAMETERS')
    })

    it('tags a peer with an expiring value', async () => {
      const name = 'a-tag'
      const value = 50
      const peer = await peerStore.save(peerId, {
        tags: {
          [name]: {
            value,
            ttl: 50
          }
        }
      })

      expect(peer).to.have.property('tags')
        .that.has.key(name)

      await delay(100)

      const updatedPeer = await peerStore.get(peerId)

      expect(updatedPeer).to.have.property('tags')
        .that.does.not.have.key(name)
    })

    it('untags a peer', async () => {
      const name = 'a-tag'
      const peer = await peerStore.save(peerId, {
        tags: {
          [name]: {}
        }
      })

      expect(peer).to.have.property('tags')
        .that.has.key(name)

      const updatedPeer = await peerStore.patch(peerId, {
        tags: {}
      })

      expect(updatedPeer).to.have.property('tags')
        .that.does.not.have.key(name)
    })
  })
})
