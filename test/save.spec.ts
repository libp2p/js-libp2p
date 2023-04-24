/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import { expect } from 'aegir/chai'
import { multiaddr } from '@multiformats/multiaddr'
import type { PeerId } from '@libp2p/interface-peer-id'
import pDefer from 'p-defer'
import { MemoryDatastore } from 'datastore-core/memory'
import { PersistentPeerStore } from '../src/index.js'
import { codes } from '../src/errors.js'
import { createEd25519PeerId, createRSAPeerId, createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { pEvent } from 'p-event'
import sinon from 'sinon'
import type { Libp2pEvents, PeerUpdate } from '@libp2p/interface-libp2p'
import { EventEmitter } from '@libp2p/interfaces/events'
import { Peer as PeerPB } from '../src/pb/peer.js'
import type { PeerData } from '@libp2p/interface-peer-store'

const addr1 = multiaddr('/ip4/127.0.0.1/tcp/8000')
const addr2 = multiaddr('/ip4/20.0.0.1/tcp/8001')

describe('save', () => {
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

  it('throws invalid parameters error if invalid PeerId is provided', async () => {
    // @ts-expect-error invalid input
    await expect(peerStore.save('invalid peerId'))
      .to.eventually.be.rejected.with.property('code', codes.ERR_INVALID_PARAMETERS)
  })

  it('throws invalid parameters error if no peer data provided', async () => {
    // @ts-expect-error invalid input
    await expect(peerStore.save(peerId))
      .to.eventually.be.rejected.with.property('code', codes.ERR_INVALID_PARAMETERS)
  })

  it('throws invalid parameters error if invalid multiaddrs are provided', async () => {
    await expect(peerStore.save(peerId, {
      // @ts-expect-error invalid input
      addresses: ['invalid multiaddr']
    }))
      .to.eventually.be.rejected.with.property('code', codes.ERR_INVALID_PARAMETERS)
  })

  it('replaces the stored content by default and emit change event', async () => {
    const supportedMultiaddrs = [addr1, addr2]
    const eventPromise = pEvent(events, 'peer:update')

    await peerStore.save(otherPeerId, {
      multiaddrs: supportedMultiaddrs
    })

    const event = await eventPromise as CustomEvent<PeerUpdate>

    const { peer, previous } = event.detail

    expect(peer.addresses).to.deep.equal(
      supportedMultiaddrs.map((multiaddr) => ({
        isCertified: false,
        multiaddr
      }))
    )
    expect(previous).to.be.undefined()
  })

  it('emits on set if not storing the exact same content', async () => {
    const defer = pDefer()

    const supportedMultiaddrsA = [addr1, addr2]
    const supportedMultiaddrsB = [addr2]

    let changeCounter = 0
    events.addEventListener('peer:update', () => {
      changeCounter++
      if (changeCounter > 1) {
        defer.resolve()
      }
    })

    // set 1
    await peerStore.save(otherPeerId, {
      multiaddrs: supportedMultiaddrsA
    })

    // set 2
    await peerStore.save(otherPeerId, {
      multiaddrs: supportedMultiaddrsB
    })

    const peer = await peerStore.get(otherPeerId)
    const multiaddrs = peer.addresses.map((mi) => mi.multiaddr)
    expect(multiaddrs).to.have.deep.members(supportedMultiaddrsB)

    await defer.promise
  })

  it('emits self event on save for self peer', async () => {
    const eventPromise = pEvent(events, 'self:peer:update')

    await peerStore.save(peerId, {
      multiaddrs: [addr1, addr2]
    })

    await eventPromise
  })

  it('does not emit on set if it is storing the exact same content', async () => {
    const defer = pDefer()

    const supportedMultiaddrs = [addr1, addr2]

    let changeCounter = 0
    events.addEventListener('peer:update', () => {
      changeCounter++
      if (changeCounter > 1) {
        defer.reject(new Error('Saved identical data twice'))
      }
    })

    // set 1
    await peerStore.save(otherPeerId, {
      multiaddrs: supportedMultiaddrs
    })

    // set 2 (same content)
    await peerStore.save(otherPeerId, {
      multiaddrs: supportedMultiaddrs
    })

    // Wait 50ms for incorrect second event
    setTimeout(() => {
      defer.resolve()
    }, 50)

    await defer.promise
  })

  it('should not set public key when key does not match', async () => {
    const edKey = await createEd25519PeerId()

    if (peerId.publicKey == null) {
      throw new Error('Public key was missing')
    }

    await expect(peerStore.save(edKey, {
      publicKey: peerId.publicKey
    })).to.eventually.be.rejectedWith(/bytes do not match/)
  })

  it('should not store a public key if already stored', async () => {
    // @ts-expect-error private fields
    const spy = sinon.spy(peerStore.store.datastore, 'put')

    if (otherPeerId.publicKey == null) {
      throw new Error('Public key was missing')
    }

    // Set PeerId
    await peerStore.save(otherPeerId, {
      publicKey: otherPeerId.publicKey
    })
    await peerStore.save(otherPeerId, {
      publicKey: otherPeerId.publicKey
    })

    expect(spy).to.have.property('callCount', 1)
  })

  it('should not store a public key if part of peer id', async () => {
    // @ts-expect-error private fields
    const spy = sinon.spy(peerStore.store.datastore, 'put')

    if (otherPeerId.publicKey == null) {
      throw new Error('Public key was missing')
    }

    const edKey = await createEd25519PeerId()
    await peerStore.save(edKey, {
      publicKey: edKey.publicKey
    })

    const dbPeerEdKey = PeerPB.decode(spy.getCall(0).args[1])
    expect(dbPeerEdKey).to.not.have.property('publicKey')

    const secpKey = await createSecp256k1PeerId()
    await peerStore.save(secpKey, {
      publicKey: secpKey.publicKey
    })

    const dbPeerSecpKey = PeerPB.decode(spy.getCall(1).args[1])
    expect(dbPeerSecpKey).to.not.have.property('publicKey')

    const rsaKey = await createRSAPeerId()
    await peerStore.save(rsaKey, {
      publicKey: rsaKey.publicKey
    })

    const dbPeerRsaKey = PeerPB.decode(spy.getCall(2).args[1])
    expect(dbPeerRsaKey).to.have.property('publicKey').that.equalBytes(rsaKey.publicKey)
  })

  it('saves all of the fields', async () => {
    const peer: PeerData = {
      multiaddrs: [
        addr1,
        addr2
      ],
      metadata: {
        foo: Uint8Array.from([0, 1, 2])
      },
      tags: {
        tag1: { value: 10 }
      },
      protocols: [
        '/foo/bar'
      ],
      peerRecordEnvelope: Uint8Array.from([3, 4, 5])
    }

    const saved = await peerStore.save(otherPeerId, peer)

    expect(saved).to.have.property('addresses').that.deep.equals([{
      multiaddr: addr1,
      isCertified: false
    }, {
      multiaddr: addr2,
      isCertified: false
    }])
    expect(saved).to.have.property('metadata').that.deep.equals(
      new Map([
        ['foo', Uint8Array.from([0, 1, 2])]
      ])
    )
    expect(saved).to.have.property('tags').that.deep.equals(
      new Map([
        ['tag1', { value: 10 }]
      ])
    )
    expect(saved).to.have.property('protocols').that.deep.equals(peer.protocols)
    expect(saved).to.have.property('peerRecordEnvelope').that.deep.equals(peer.peerRecordEnvelope)
  })
})
