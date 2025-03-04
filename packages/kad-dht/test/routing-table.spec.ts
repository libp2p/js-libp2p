/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter, stop, start } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromString, peerIdFromPrivateKey } from '@libp2p/peer-id'
import { persistentPeerStore } from '@libp2p/peer-store'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import delay from 'delay'
import drain from 'it-drain'
import random from 'lodash.random'
import { pEvent } from 'p-event'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { PROTOCOL } from '../src/constants.js'
import { MessageType } from '../src/message/dht.js'
import { peerResponseEvent } from '../src/query/events.js'
import { KAD_PEER_TAG_NAME, KAD_PEER_TAG_VALUE, RoutingTable, type RoutingTableComponents } from '../src/routing-table/index.js'
import { isLeafBucket } from '../src/routing-table/k-bucket.js'
import * as kadUtils from '../src/utils.js'
import { createPeerId, createPeerIds } from './utils/create-peer-id.js'
import type { Network } from '../src/network.js'
import type { Bucket } from '../src/routing-table/k-bucket.js'
import type { Libp2pEvents, PeerId, PeerStore, Peer } from '@libp2p/interface'

describe('Routing Table', () => {
  let table: RoutingTable
  let components: RoutingTableComponents
  let network: StubbedInstance<Network>

  beforeEach(async function () {
    this.timeout(20 * 1000)

    const events = new TypedEventEmitter<Libp2pEvents>()
    network = stubInterface()

    components = {
      peerId: await createPeerId(),
      peerStore: stubInterface<PeerStore>(),
      logger: defaultLogger()
    }
    components.peerStore = persistentPeerStore({
      ...components,
      datastore: new MemoryDatastore(),
      events
    })

    table = new RoutingTable(components, {
      logPrefix: '',
      metricsPrefix: '',
      protocol: PROTOCOL,
      network
    })
    await start(table)

    // simulate connection succeeding
    network.sendRequest.callsFake(async function * (from: PeerId) {
      yield peerResponseEvent({
        from,
        messageType: MessageType.PING
      })
    })
  })

  afterEach(async () => {
    await stop(table)
  })

  it('adds peers', async () => {
    await stop(table)

    // make a very small routing table with a predictable structure
    table = new RoutingTable({
      ...components,
      // self peer kad id prefix is 00010
      peerId: peerIdFromString('12D3KooWNq99a7DtUgvzyiHwvBX4m7TDLmn6nLZvJUzSt72wc1Zu')
    }, {
      logPrefix: '',
      metricsPrefix: '',
      protocol: PROTOCOL,
      kBucketSize: 2,
      prefixLength: 3,
      network
    })
    await start(table)

    const peerIds = [
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi3'), // 00010
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi7'), // 00011
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZiA'), // 00111
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZiB'), // 01000
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZiC'), // 11111
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZiD'), // 11110
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZiE'), // 10111
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZib') // 11001
    ]

    for (const peerId of peerIds) {
      await table.add(peerId)
    }

    const trie = collect(table.kb.root)

    expect(trie).to.deep.equal({
      left: {
        prefix: '0',
        depth: 1,
        left: {
          prefix: '0',
          depth: 2,
          left: {
            prefix: '0',
            depth: 3,
            peers: [
              'QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi3', // 00010
              'QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi7' //  00011
            ]
          },
          right: {
            prefix: '1',
            depth: 3,
            peers: [
              'QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZiA' // 00111
            ]
          }
        },
        right: {
          prefix: '1',
          depth: 2,
          peers: [
            'QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZiB' // 01000
          ]
        }
      },
      right: {
        prefix: '1',
        depth: 1,
        left: {
          prefix: '0',
          depth: 2,
          peers: [
            'QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZiE' // 10111
          ]
        },
        right: {
          prefix: '1',
          depth: 2,
          left: {
            prefix: '0',
            depth: 3,
            peers: [
              'QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZib' // 11001
            ]
          },
          right: {
            prefix: '1',
            depth: 3,
            peers: [
              'QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZiC', // 11111
              'QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZiD' //  11110
            ]
          }
        }
      }
    })

    function collect (bucket: Bucket, obj: any = {}): any {
      if (isLeafBucket(bucket)) {
        return {
          prefix: bucket.prefix,
          depth: bucket.depth,
          peers: bucket.peers.map(p => p.peerId.toString())
        }
      } else {
        obj.prefix = bucket.prefix
        obj.depth = bucket.depth
        obj.left = collect(bucket.left, {})
        obj.right = collect(bucket.right, {})
      }

      return JSON.parse(JSON.stringify(obj))
    }
  })

  it('should add a lot of duplicated peers', async function () {
    this.timeout(20 * 1000)

    const ids = await createPeerIds(20)

    await Promise.all(
      Array.from({ length: 1000 }).map(async () => { await table.add(ids[random(ids.length - 1)]) })
    )

    await Promise.all(
      Array.from({ length: 20 }).map(async () => {
        const id = ids[random(ids.length - 1)]
        const key = await kadUtils.convertPeerId(id)

        expect(table.closestPeers(key, 5).length)
          .to.be.above(0)
      })
    )
  })

  it('should tag peers on add', async function () {
    const peerCount = 100
    const ids = await createPeerIds(peerCount)

    for (const id of ids) {
      await table.add(id)
    }

    expect(table.size).to.equal(peerCount)

    // assert peers are tagged
    const walked = await assertPeerTags(table.kb.root)

    expect(walked).to.equal(peerCount)

    async function assertPeerTags (bucket: Bucket): Promise<number> {
      let peers = 0

      if (isLeafBucket(bucket)) {
        for (const contact of bucket.peers) {
          peers++

          const peer = await components.peerStore.get(contact.peerId)
          const tags = [...peer.tags.keys()]

          expect(tags).to.contain(KAD_PEER_TAG_NAME)
        }
      } else {
        if (bucket.left != null) {
          peers += await assertPeerTags(bucket.left)
        }

        if (bucket.right != null) {
          peers += await assertPeerTags(bucket.right)
        }
      }

      return peers
    }
  })

  it('should untag peers on remove', async function () {
    const peerCount = 100
    const ids = await createPeerIds(peerCount)

    for (const id of ids) {
      await table.add(id)
    }

    const removePeer = ids[0]
    await table.remove(removePeer)

    const peer = await components.peerStore.get(removePeer)
    const tags = [...peer.tags.keys()]

    expect(tags).to.not.contain(KAD_PEER_TAG_NAME)
  })

  it('emits peer:add event', async () => {
    const id = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const eventPromise = pEvent<'peer:add', CustomEvent<PeerId>>(table, 'peer:add')

    await table.add(id)

    const event = await eventPromise
    expect(event.detail.toString()).to.equal(id.toString())
  })

  it('remove', async function () {
    const peers = await createPeerIds(10)
    await Promise.all(peers.map(async (peer) => {
      await table.add(peer)
    }))

    const key = await kadUtils.convertPeerId(peers[2])
    expect(table.closestPeers(key, 10)).to.have.length(10)
    await expect(table.find(peers[5])).to.eventually.be.ok()
    expect(table.size).to.equal(10)

    await table.remove(peers[5])
    await expect(table.find(peers[5])).to.eventually.be.undefined()
    expect(table.size).to.equal(9)
  })

  it('emits peer:remove event', async () => {
    const id = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const eventPromise = pEvent<'peer:remove', CustomEvent<PeerId>>(table, 'peer:remove')

    await table.add(id)
    await table.remove(id)

    const event = await eventPromise
    expect(event.detail.toString()).to.equal(id.toString())
  })

  it('closestPeer', async function () {
    this.timeout(10 * 1000)

    const peers = await createPeerIds(4)
    await Promise.all(peers.map(async (peer) => { await table.add(peer) }))

    const id = peers[2]
    const key = await kadUtils.convertPeerId(id)
    expect(table.closestPeer(key)).to.eql(id)
  })

  it('closestPeers', async function () {
    this.timeout(20 * 1000)

    const peers = await createPeerIds(18)
    await Promise.all(peers.map(async (peer) => { await table.add(peer) }))

    const key = await kadUtils.convertPeerId(peers[2])
    expect(table.closestPeers(key, 15)).to.have.length(15)
  })

  it('favours old peers that respond to pings', async () => {
    const peerIds = [
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi5'),
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi6')
    ]

    const oldPeer = {
      kadId: await kadUtils.convertPeerId(peerIds[0]),
      peerId: peerIds[0],
      lastPing: 0
    }
    const newPeer = {
      kadId: await kadUtils.convertPeerId(peerIds[1]),
      peerId: peerIds[1],
      lastPing: Date.now()
    }

    // add the old peer
    await table.kb.add(oldPeer.peerId)

    await drain(table.pingOldContacts([oldPeer]))

    expect(network.sendRequest.calledTwice).to.be.true()
    expect(network.sendRequest.calledWith(oldPeer.peerId)).to.be.true()

    // did not add the new peer
    expect(table.kb.get(newPeer.kadId)).to.be.undefined()

    // kept the old peer
    expect(table.kb.get(oldPeer.kadId)).to.not.be.undefined()
  })

  it('evicts oldest peer that does not respond to ping', async () => {
    await stop(table)

    // make a very small routing table with a predictable structure
    table = new RoutingTable({
      ...components,
      peerId: peerIdFromString('12D3KooWNq99a7DtUgvzyiHwvBX4m7TDLmn6nLZvJUzSt72wc1Zu')
    }, {
      logPrefix: '',
      metricsPrefix: '',
      protocol: PROTOCOL,
      kBucketSize: 1,
      prefixLength: 1,
      network,
      lastPingThreshold: 1
    })
    await start(table)

    const peerIds = [
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi1'),
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi2')
    ]

    for (const peerId of peerIds) {
      await table.add(peerId)
    }

    const newPeerId = peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi5')

    const oldPeer = {
      kadId: await kadUtils.convertPeerId(peerIds[0]),
      peerId: peerIds[0]
    }
    const newPeer = {
      kadId: await kadUtils.convertPeerId(newPeerId),
      peerId: newPeerId
    }

    // ensure the lastPing threshold is passed
    await delay(100)

    // reset network stub so we can have specific behavior
    table.network = network = stubInterface()

    // libp2p fails to dial the old peer
    network.sendRequest.withArgs(oldPeer.peerId).rejects(new Error('Could not dial peer'))

    // the new peer answers the ping
    network.sendRequest.withArgs(newPeer.peerId).callsFake(async function * (from: PeerId) {
      yield peerResponseEvent({
        from,
        messageType: MessageType.PING
      })
    })

    // add the old peer
    await table.kb.add(oldPeer.peerId)

    // add the new peer
    await table.kb.add(newPeer.peerId)

    // added the new peer
    expect(table.kb.get(newPeer.kadId)).to.not.be.undefined()

    // evicted the old peer
    expect(table.kb.get(oldPeer.kadId)).to.be.undefined()
  })

  it('tags newly found kad-close peers', async () => {
    await stop(table)

    // make a very small routing table with a predictable structure
    table = new RoutingTable({
      ...components,
      // self peer kad id prefix is 00010
      peerId: peerIdFromString('12D3KooWNq99a7DtUgvzyiHwvBX4m7TDLmn6nLZvJUzSt72wc1Zu')
    }, {
      logPrefix: '',
      metricsPrefix: '',
      protocol: PROTOCOL,
      kBucketSize: 2,
      prefixLength: 2,
      network
    })
    await start(table)

    const peerIds = [
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi3'), // 00010
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZiB') // 01000
    ]

    for (const peerId of peerIds) {
      await table.add(peerId)
    }

    // current close peer should be marked close
    const closePeerData = await components.peerStore.get(peerIds[1])
    expect(closePeerData.tags.has(KAD_PEER_TAG_NAME)).to.be.true()

    const newPeer = peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZiA') // 00111

    await table.add(newPeer)

    // new peer should be marked close
    const newPeerData = await components.peerStore.get(newPeer)
    expect(newPeerData.tags.has(KAD_PEER_TAG_NAME)).to.be.true()

    // not close but not evicted from the table because it wasn't full yet
    const movedPeerData = await components.peerStore.get(peerIds[1])
    expect(movedPeerData.tags.has(KAD_PEER_TAG_NAME)).to.be.true()
  })

  it('adds peer store peers to the routing table on startup', async () => {
    const peer = stubInterface<Peer>({
      id: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      protocols: [
        PROTOCOL
      ],
      tags: new Map([[KAD_PEER_TAG_NAME, { value: KAD_PEER_TAG_VALUE }]])
    })

    await expect(table.find(peer.id)).to.eventually.be.undefined()

    await stop(table)

    components.peerStore.all = async () => [peer]

    await start(table)

    // this is done asynchronously
    await pEvent(table, 'peer:add')

    await expect(table.find(peer.id)).to.eventually.be.ok()
  })

  describe('max size', () => {
    it('should constrain size to 10', async () => {
      const prefixLength = 8
      const kBucketSize = 20
      const maxSize = Math.pow(2, prefixLength) * kBucketSize

      table = new RoutingTable(components, {
        logPrefix: '',
        metricsPrefix: '',
        protocol: PROTOCOL,
        network,
        prefixLength,
        kBucketSize
      })
      await start(table)

      // reset network stub so we can have specific behavior
      table.network = network = stubInterface()

      // all old peers answer pings, no peers should be evicted
      network.sendRequest.callsFake(async function * (from: PeerId) {
        yield peerResponseEvent({
          from,
          messageType: MessageType.PING
        })
      })

      for (let i = 0; i < 2 * maxSize; i++) {
        const remotePeer = await createPeerId()
        await table.add(remotePeer)
      }

      expect(table.size).to.be.lessThanOrEqual(maxSize)
    })
  })
})
