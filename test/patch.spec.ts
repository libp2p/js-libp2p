/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import { expect } from 'aegir/chai'
import { multiaddr } from '@multiformats/multiaddr'
import type { PeerId } from '@libp2p/interface-peer-id'
import { MemoryDatastore } from 'datastore-core/memory'
import { PersistentPeerStore } from '../src/index.js'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { PeerData } from '@libp2p/interface-peer-store'
import { pEvent } from 'p-event'
import { EventEmitter } from '@libp2p/interfaces/events'
import type { Libp2pEvents } from '@libp2p/interface-libp2p'

const addr1 = multiaddr('/ip4/127.0.0.1/tcp/8000')
const addr2 = multiaddr('/ip4/20.0.0.1/tcp/8001')
const addr3 = multiaddr('/ip4/127.0.0.1/tcp/8002')

describe('patch', () => {
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

  it('emits peer:update event on patch', async () => {
    const eventPromise = pEvent(events, 'peer:update')

    await peerStore.patch(otherPeerId, {
      multiaddrs: [addr1, addr2]
    })

    await eventPromise
  })

  it('emits self:peer:update event on patch for self peer', async () => {
    const eventPromise = pEvent(events, 'self:peer:update')

    await peerStore.patch(peerId, {
      multiaddrs: [addr1, addr2]
    })

    await eventPromise
  })

  it('replaces multiaddrs', async () => {
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

    const original = await peerStore.save(otherPeerId, peer)
    const updated = await peerStore.patch(otherPeerId, {
      multiaddrs: [
        addr3
      ]
    })

    // upated field
    expect(updated).to.have.property('addresses').that.deep.equals([{
      multiaddr: addr3,
      isCertified: false
    }])

    // other fields should be untouched
    expect(updated).to.have.property('metadata').that.deep.equals(original.metadata)
    expect(updated).to.have.property('tags').that.deep.equals(original.tags)
    expect(updated).to.have.property('protocols').that.deep.equals(original.protocols)
    expect(updated).to.have.property('peerRecordEnvelope').that.deep.equals(original.peerRecordEnvelope)
  })

  it('replaces metadata', async () => {
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

    const original = await peerStore.save(otherPeerId, peer)
    const updated = await peerStore.patch(otherPeerId, {
      metadata: {
        bar: Uint8Array.from([3, 4, 5])
      }
    })

    expect(updated).to.have.property('metadata').that.deep.equals(
      new Map([['bar', Uint8Array.from([3, 4, 5])]])
    )

    // other fields should be untouched
    expect(updated).to.have.property('addresses').that.deep.equals(original.addresses)
    expect(updated).to.have.property('tags').that.deep.equals(original.tags)
    expect(updated).to.have.property('protocols').that.deep.equals(original.protocols)
    expect(updated).to.have.property('peerRecordEnvelope').that.deep.equals(original.peerRecordEnvelope)
  })

  it('replaces tags', async () => {
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

    const original = await peerStore.save(otherPeerId, peer)
    const updated = await peerStore.patch(otherPeerId, {
      tags: {
        tag2: { value: 20 }
      }
    })

    expect(updated).to.have.property('tags').that.deep.equals(
      new Map([['tag2', { value: 20 }]])
    )

    // other fields should be untouched
    expect(updated).to.have.property('addresses').that.deep.equals(original.addresses)
    expect(updated).to.have.property('metadata').that.deep.equals(original.metadata)
    expect(updated).to.have.property('protocols').that.deep.equals(original.protocols)
    expect(updated).to.have.property('peerRecordEnvelope').that.deep.equals(original.peerRecordEnvelope)
  })

  it('replaces peer record envelope', async () => {
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

    const original = await peerStore.save(otherPeerId, peer)
    const updated = await peerStore.patch(otherPeerId, {
      peerRecordEnvelope: Uint8Array.from([6, 7, 8])
    })

    expect(updated).to.have.property('peerRecordEnvelope').that.deep.equals(
      Uint8Array.from([6, 7, 8])
    )

    // other fields should be untouched
    expect(updated).to.have.property('addresses').that.deep.equals(original.addresses)
    expect(updated).to.have.property('metadata').that.deep.equals(original.metadata)
    expect(updated).to.have.property('tags').that.deep.equals(original.tags)
    expect(updated).to.have.property('protocols').that.deep.equals(original.protocols)
  })
})
