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
import { peerIdToDatastoreKey } from '../src/utils/peer-id-to-datastore-key.js'
import type { TypedEventTarget, Libp2pEvents, PeerId, PeerStore, PeerData } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'

const addr1 = multiaddr('/ip4/127.0.0.1/tcp/8000')
const addr2 = multiaddr('/ip4/20.0.0.1/tcp/8001')
const addr3 = multiaddr('/ip4/127.0.0.1/tcp/8002')

describe('merge', () => {
  let peerId: PeerId
  let otherPeerId: PeerId
  let peerStore: PeerStore
  let events: TypedEventTarget<Libp2pEvents>
  let datastore: Datastore

  beforeEach(async () => {
    peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    otherPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    events = new TypedEventEmitter()
    datastore = new MemoryDatastore()
    peerStore = persistentPeerStore({
      peerId,
      events,
      datastore,
      logger: defaultLogger()
    })
  })

  it('emits peer:update event on merge', async () => {
    const eventPromise = pEvent(events, 'peer:update')

    await peerStore.merge(otherPeerId, {
      multiaddrs: [addr1, addr2]
    })

    await eventPromise
  })

  it('emits self:peer:update event on merge for self peer', async () => {
    const eventPromise = pEvent(events, 'self:peer:update')

    await peerStore.merge(peerId, {
      multiaddrs: [addr1, addr2]
    })

    await eventPromise
  })

  it('merges multiaddrs', async () => {
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
    const updated = await peerStore.merge(otherPeerId, {
      multiaddrs: [
        addr3
      ]
    })

    expect(updated).to.have.property('addresses').that.deep.equals([{
      multiaddr: addr1,
      isCertified: false
    }, {
      multiaddr: addr3,
      isCertified: false
    }, {
      multiaddr: addr2,
      isCertified: false
    }])

    // other fields should be untouched
    expect(updated).to.have.property('metadata').that.deep.equals(original.metadata)
    expect(updated).to.have.property('tags').that.deep.equals(original.tags)
    expect(updated).to.have.property('protocols').that.deep.equals(original.protocols)
    expect(updated).to.have.property('peerRecordEnvelope').that.deep.equals(original.peerRecordEnvelope)
  })

  it('merges metadata', async () => {
    const peer: PeerData = {
      multiaddrs: [
        addr1,
        addr2
      ],
      metadata: {
        foo: Uint8Array.from([0, 1, 2]),
        baz: Uint8Array.from([6, 7, 8])
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
    const updated = await peerStore.merge(otherPeerId, {
      metadata: {
        bar: Uint8Array.from([3, 4, 5]),
        baz: undefined
      }
    })

    expect(updated).to.have.property('metadata').that.deep.equals(
      new Map([
        ['foo', Uint8Array.from([0, 1, 2])],
        ['bar', Uint8Array.from([3, 4, 5])]
      ])
    )

    // other fields should be untouched
    expect(updated).to.have.property('addresses').that.deep.equals(original.addresses)
    expect(updated).to.have.property('tags').that.deep.equals(original.tags)
    expect(updated).to.have.property('protocols').that.deep.equals(original.protocols)
    expect(updated).to.have.property('peerRecordEnvelope').that.deep.equals(original.peerRecordEnvelope)
  })

  it('merges tags', async () => {
    const peer: PeerData = {
      multiaddrs: [
        addr1,
        addr2
      ],
      metadata: {
        foo: Uint8Array.from([0, 1, 2])
      },
      tags: {
        tag1: { value: 10 },
        tag3: { value: 50 }
      },
      protocols: [
        '/foo/bar'
      ],
      peerRecordEnvelope: Uint8Array.from([3, 4, 5])
    }

    const original = await peerStore.patch(otherPeerId, peer)
    const updated = await peerStore.merge(otherPeerId, {
      tags: {
        tag2: { value: 20 },
        tag3: undefined
      }
    })

    expect(updated).to.have.property('tags').that.deep.equals(
      new Map([
        ['tag1', { value: 10 }],
        ['tag2', { value: 20 }]
      ])
    )

    // other fields should be untouched
    expect(updated).to.have.property('addresses').that.deep.equals(original.addresses)
    expect(updated).to.have.property('metadata').that.deep.equals(original.metadata)
    expect(updated).to.have.property('protocols').that.deep.equals(original.protocols)
    expect(updated).to.have.property('peerRecordEnvelope').that.deep.equals(original.peerRecordEnvelope)
  })

  it('merges protocols', async () => {
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
    const updated = await peerStore.merge(otherPeerId, {
      protocols: [
        '/bar/foo'
      ]
    })

    expect(updated).to.have.property('protocols').that.deep.equals([
      '/bar/foo',
      '/foo/bar'
    ])

    // other fields should be untouched
    expect(updated).to.have.property('addresses').that.deep.equals(original.addresses)
    expect(updated).to.have.property('metadata').that.deep.equals(original.metadata)
    expect(updated).to.have.property('tags').that.deep.equals(original.tags)
    expect(updated).to.have.property('peerRecordEnvelope').that.deep.equals(original.peerRecordEnvelope)
  })

  it('merges peer record envelope', async () => {
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
    const updated = await peerStore.merge(otherPeerId, {
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

  it('should ignore corrupt peer store data', async () => {
    const badPeer: PeerData = {
      multiaddrs: [
        addr1
      ]
    }
    await peerStore.save(otherPeerId, badPeer)
    const key = peerIdToDatastoreKey(otherPeerId)

    // store unparsable data
    await datastore.put(key, Uint8Array.from([0, 1, 2, 3, 4, 5]))

    // update the peer
    const peer: PeerData = {
      multiaddrs: [
        addr2
      ]
    }
    const updated = await peerStore.merge(otherPeerId, peer)

    expect(updated).to.have.property('addresses').that.deep.equals([{
      multiaddr: addr2,
      isCertified: false
    }])
  })
})
