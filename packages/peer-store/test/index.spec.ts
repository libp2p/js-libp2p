/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import { TypedEventEmitter, type TypedEventTarget, type Libp2pEvents, type PeerId } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import delay from 'delay'
import { PersistentPeerStore } from '../src/index.js'

const addr1 = multiaddr('/ip4/127.0.0.1/tcp/8000')

describe('PersistentPeerStore', () => {
  let peerId: PeerId
  let otherPeerId: PeerId
  let peerStore: PersistentPeerStore
  let events: TypedEventTarget<Libp2pEvents>

  beforeEach(async () => {
    peerId = await createEd25519PeerId()
    otherPeerId = await createEd25519PeerId()
    events = new TypedEventEmitter()
    peerStore = new PersistentPeerStore({
      peerId,
      events,
      datastore: new MemoryDatastore(),
      logger: defaultLogger()
    })
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
        .with.property('name', 'InvalidParametersError')
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
        .to.eventually.be.rejected().with.property('name', 'InvalidParametersError')

      await expect(peerStore.save(peerId, {
        tags: {
          [name]: { value: 101 }
        }
      }), 'PeerStore contain tag for peer where value was too large')
        .to.eventually.be.rejected().with.property('name', 'InvalidParametersError')

      await expect(peerStore.save(peerId, {
        tags: {
          [name]: { value: 5.5 }
        }
      }), 'PeerStore contain tag for peer where value was not an integer')
        .to.eventually.be.rejected().with.property('name', 'InvalidParametersError')
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

  describe('peer record', () => {
    it('consumes a peer record, creating a peer', async () => {
      const peerRecord = new PeerRecord({
        peerId,
        multiaddrs: [
          multiaddr('/ip4/127.0.0.1/tcp/1234')
        ]
      })
      const signedPeerRecord = await RecordEnvelope.seal(peerRecord, peerId)

      await expect(peerStore.has(peerId)).to.eventually.be.false()
      await peerStore.consumePeerRecord(signedPeerRecord.marshal())
      await expect(peerStore.has(peerId)).to.eventually.be.true()

      const peer = await peerStore.get(peerId)
      expect(peer.addresses.map(({ multiaddr, isCertified }) => ({
        isCertified,
        multiaddr: multiaddr.toString()
      }))).to.deep.equal([{
        isCertified: true,
        multiaddr: '/ip4/127.0.0.1/tcp/1234'
      }])
    })

    it('overwrites old addresses with those from a peer record', async () => {
      await peerStore.patch(peerId, {
        multiaddrs: [
          multiaddr('/ip4/127.0.0.1/tcp/1234')
        ]
      })

      const peerRecord = new PeerRecord({
        peerId,
        multiaddrs: [
          multiaddr('/ip4/127.0.0.1/tcp/4567')
        ]
      })
      const signedPeerRecord = await RecordEnvelope.seal(peerRecord, peerId)

      await peerStore.consumePeerRecord(signedPeerRecord.marshal())

      await expect(peerStore.has(peerId)).to.eventually.be.true()

      const peer = await peerStore.get(peerId)
      expect(peer.addresses.map(({ multiaddr, isCertified }) => ({
        isCertified,
        multiaddr: multiaddr.toString()
      }))).to.deep.equal([{
        isCertified: true,
        multiaddr: '/ip4/127.0.0.1/tcp/4567'
      }])
    })

    it('ignores older peer records', async () => {
      const oldSignedPeerRecord = await RecordEnvelope.seal(new PeerRecord({
        peerId,
        multiaddrs: [
          multiaddr('/ip4/127.0.0.1/tcp/1234')
        ],
        seqNumber: 1n
      }), peerId)

      const newSignedPeerRecord = await RecordEnvelope.seal(new PeerRecord({
        peerId,
        multiaddrs: [
          multiaddr('/ip4/127.0.0.1/tcp/4567')
        ],
        seqNumber: 2n
      }), peerId)

      await expect(peerStore.consumePeerRecord(newSignedPeerRecord.marshal())).to.eventually.equal(true)
      await expect(peerStore.consumePeerRecord(oldSignedPeerRecord.marshal())).to.eventually.equal(false)

      const peer = await peerStore.get(peerId)
      expect(peer.addresses.map(({ multiaddr, isCertified }) => ({
        isCertified,
        multiaddr: multiaddr.toString()
      }))).to.deep.equal([{
        isCertified: true,
        multiaddr: '/ip4/127.0.0.1/tcp/4567'
      }])
    })

    it('ignores record for unexpected peer', async () => {
      const signedPeerRecord = await RecordEnvelope.seal(new PeerRecord({
        peerId,
        multiaddrs: [
          multiaddr('/ip4/127.0.0.1/tcp/4567')
        ]
      }), peerId)

      await expect(peerStore.has(peerId)).to.eventually.be.false()
      await expect(peerStore.consumePeerRecord(signedPeerRecord.marshal(), otherPeerId)).to.eventually.equal(false)
      await expect(peerStore.has(peerId)).to.eventually.be.false()
    })

    it('allows queries', async () => {
      await peerStore.save(otherPeerId, {
        multiaddrs: [
          addr1
        ]
      })

      const allPeers = await peerStore.all({
        filters: [
          () => true
        ]
      })

      expect(allPeers).to.not.be.empty()

      const noPeers = await peerStore.all({
        filters: [
          () => false
        ]
      })

      expect(noPeers).to.be.empty()
    })
  })
})
