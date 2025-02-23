/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { pEvent } from 'p-event'
import { persistentPeerStore } from '../src/index.js'
import type { TypedEventTarget, Libp2pEvents, PeerId, PeerStore, PeerData } from '@libp2p/interface'

const addr1 = multiaddr('/ip4/127.0.0.1/tcp/8000')
const addr2 = multiaddr('/ip4/20.0.0.1/tcp/8001')
const addr3 = multiaddr('/ip4/127.0.0.1/tcp/8002')

describe('patch', () => {
  let peerId: PeerId
  let otherPeerId: PeerId
  let peerStore: PeerStore
  let events: TypedEventTarget<Libp2pEvents>

  beforeEach(async () => {
    peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    otherPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    events = new TypedEventEmitter()
    peerStore = persistentPeerStore({
      peerId,
      events,
      datastore: new MemoryDatastore(),
      logger: defaultLogger()
    })
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

    // updated field
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

  it('replaces protocols', async () => {
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
      protocols: [
        '/bar/foo'
      ]
    })

    expect(updated).to.have.property('protocols').that.deep.equals([
      '/bar/foo'
    ])

    // other fields should be untouched
    expect(updated).to.have.property('addresses').that.deep.equals(original.addresses)
    expect(updated).to.have.property('metadata').that.deep.equals(original.metadata)
    expect(updated).to.have.property('tags').that.deep.equals(original.tags)
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
