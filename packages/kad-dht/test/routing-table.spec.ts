/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter, stop, start, KEEP_ALIVE } from '@libp2p/interface'
import { mockConnectionManager } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { PeerSet } from '@libp2p/peer-collections'
import { peerIdFromString, peerIdFromPrivateKey } from '@libp2p/peer-id'
import { persistentPeerStore } from '@libp2p/peer-store'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import all from 'it-all'
import drain from 'it-drain'
import { pipe } from 'it-pipe'
import random from 'lodash.random'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { PROTOCOL } from '../src/constants.js'
import { Message, MessageType } from '../src/message/dht.js'
import { KAD_CLOSE_TAG_NAME, KAD_CLOSE_TAG_VALUE, KBUCKET_SIZE, RoutingTable, type RoutingTableComponents } from '../src/routing-table/index.js'
import * as kadUtils from '../src/utils.js'
import { createPeerId, createPeerIds } from './utils/create-peer-id.js'
import { sortClosestPeers } from './utils/sort-closest-peers.js'
import type { Libp2pEvents, PeerId, PeerStore, Stream, Peer } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'

describe('Routing Table', () => {
  let table: RoutingTable
  let components: RoutingTableComponents

  beforeEach(async function () {
    this.timeout(20 * 1000)

    const events = new TypedEventEmitter<Libp2pEvents>()

    components = {
      peerId: await createPeerId(),
      connectionManager: stubInterface<ConnectionManager>(),
      peerStore: stubInterface<PeerStore>(),
      logger: defaultLogger()
    }
    components.connectionManager = mockConnectionManager({
      ...components,
      registrar: stubInterface<Registrar>(),
      events
    })
    components.peerStore = persistentPeerStore({
      ...components,
      datastore: new MemoryDatastore(),
      events
    })

    table = new RoutingTable(components, {
      logPrefix: '',
      protocol: PROTOCOL
    })
    await start(table)
  })

  afterEach(async () => {
    await stop(table)
  })

  it('add', async function () {
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

  it('emits peer:add event', async () => {
    const id = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const eventPromise = pEvent<'peer:add', CustomEvent<PeerId>>(table, 'peer:add')

    await table.add(id)

    const event = await eventPromise
    expect(event.detail.toString()).to.equal(id.toString())
  })

  it('remove', async function () {
    const peers = await createPeerIds(10)
    await Promise.all(peers.map(async (peer) => { await table.add(peer) }))

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
      peerId: peerIds[0]
    }
    const newPeer = {
      kadId: await kadUtils.convertPeerId(peerIds[1]),
      peerId: peerIds[1]
    }

    if (table.kb == null) {
      throw new Error('kbucket not defined')
    }

    // add the old peer
    table.kb.add(oldPeer)

    const stream = stubInterface<Stream>({
      source: (async function * () {
        yield new Uint8ArrayList(Uint8Array.from([2]), Message.encode({
          type: MessageType.PING
        }))
      })(),
      sink: async function (source) {
        await drain(source)
      }
    })

    // simulate connection succeeding
    const newStreamStub = sinon.stub().withArgs(PROTOCOL).resolves(stream)
    const openConnectionStub = sinon.stub().withArgs(oldPeer.peerId).resolves({
      newStream: newStreamStub
    })
    components.connectionManager.openConnection = openConnectionStub

    await table._onPing(new CustomEvent('ping', { detail: { oldContacts: [oldPeer], newContact: newPeer } }))

    expect(openConnectionStub.calledOnce).to.be.true()
    expect(openConnectionStub.calledWith(oldPeer.peerId)).to.be.true()

    expect(newStreamStub.callCount).to.equal(1)
    expect(newStreamStub.calledWith(PROTOCOL)).to.be.true()

    // did not add the new peer
    expect(table.kb.get(newPeer.kadId)).to.be.undefined()

    // kept the old peer
    expect(table.kb.get(oldPeer.kadId)).to.not.be.undefined()
  })

  it('evicts oldest peer that does not respond to ping', async () => {
    const peerIds = [
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi5'),
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi6')
    ]

    const oldPeer = {
      kadId: await kadUtils.convertPeerId(peerIds[0]),
      peerId: peerIds[0]
    }
    const newPeer = {
      kadId: await kadUtils.convertPeerId(peerIds[1]),
      peerId: peerIds[1]
    }

    // libp2p fails to dial the old peer
    const openConnectionStub = sinon.stub().withArgs(oldPeer.peerId).rejects(new Error('Could not dial peer'))
    components.connectionManager.openConnection = openConnectionStub

    if (table.kb == null) {
      throw new Error('kbucket not defined')
    }

    // add the old peer
    table.kb.add(oldPeer)

    await table._onPing(new CustomEvent('ping', { detail: { oldContacts: [oldPeer], newContact: newPeer } }))
    await table.pingQueue.onIdle()

    expect(openConnectionStub.callCount).to.equal(1)
    expect(openConnectionStub.calledWith(oldPeer.peerId)).to.be.true()

    // added the new peer
    expect(table.kb.get(newPeer.kadId)).to.not.be.undefined()

    // evicted the old peer
    expect(table.kb.get(oldPeer.kadId)).to.be.undefined()
  })

  it('tags newly found kad-close peers', async () => {
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const tagPeerSpy = sinon.spy(components.peerStore, 'merge')

    await table.add(remotePeer)

    expect(tagPeerSpy.callCount).to.equal(0, 'did not debounce call to peerStore.tagPeer')

    await pWaitFor(() => {
      return tagPeerSpy.callCount === 1
    })

    expect(tagPeerSpy.callCount).to.equal(1, 'did not tag kad-close peer')
    expect(tagPeerSpy.getCall(0).args[0].toString()).to.equal(remotePeer.toString())
    expect(tagPeerSpy.getCall(0).args[1].tags).to.deep.equal({
      [KAD_CLOSE_TAG_NAME]: {
        value: KAD_CLOSE_TAG_VALUE
      },
      [KEEP_ALIVE]: {
        value: 1
      }
    })
  })

  it('removes tags from kad-close peers when closer peers are found', async () => {
    async function getTaggedPeers (): Promise<PeerSet> {
      return new PeerSet(await pipe(
        await components.peerStore.all(),
        async function * (source) {
          for await (const peer of source) {
            const peerData = await components.peerStore.get(peer.id)

            if (peerData.tags.has(KAD_CLOSE_TAG_NAME)) {
              yield peer.id
            }
          }
        },
        async (source) => all(source)
      ))
    }

    const tagPeerSpy = sinon.spy(components.peerStore, 'merge')
    const localNodeId = await kadUtils.convertPeerId(components.peerId)
    const sortedPeerList = await sortClosestPeers(
      await createPeerIds(KBUCKET_SIZE + 1),
      localNodeId
    )

    // sort list furthest -> closest
    sortedPeerList.reverse()

    // fill the table up to the first kbucket size
    for (let i = 0; i < KBUCKET_SIZE; i++) {
      await table.add(sortedPeerList[i])
    }

    // should have all added contacts in the root kbucket
    expect(table.kb?.count()).to.equal(KBUCKET_SIZE, 'did not fill kbuckets')
    expect(table.kb?.root).to.have.property('peers').with.lengthOf(KBUCKET_SIZE, 'split root kbucket when we should not have')
    expect(table.kb?.root).to.not.have.property('left', 'split root kbucket when we should not have')
    expect(table.kb?.root).to.not.have.property('right', 'split root kbucket when we should not have')

    await pWaitFor(() => {
      return tagPeerSpy.callCount === KBUCKET_SIZE
    })

    // make sure we tagged all of the peers as kad-close
    const taggedPeers = await getTaggedPeers()
    expect(taggedPeers.difference(new PeerSet(sortedPeerList.slice(0, sortedPeerList.length - 1)))).to.have.property('size', 0)
    tagPeerSpy.resetHistory()

    // add a node that is closer than any added so far
    await table.add(sortedPeerList[sortedPeerList.length - 1])

    expect(table.kb?.count()).to.equal(KBUCKET_SIZE + 1, 'did not fill kbuckets')
    expect(table.kb?.root).to.have.property('left').that.is.not.null('did not split root kbucket when we should have')
    expect(table.kb?.root).to.have.property('right').that.is.not.null('did not split root kbucket when we should have')

    // wait for tag new peer and untag old peer
    await pWaitFor(() => {
      return tagPeerSpy.callCount === 2
    })

    // should have updated list of tagged peers
    const finalTaggedPeers = await getTaggedPeers()
    expect(finalTaggedPeers.difference(new PeerSet(sortedPeerList.slice(1)))).to.have.property('size', 0)
  })

  it('adds peerstore peers to the routing table on startup', async () => {
    const peer1 = stubInterface<Peer>({
      id: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      protocols: [
        PROTOCOL
      ]
    })
    const peer2 = stubInterface<Peer>({
      id: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      protocols: [
        '/ipfs/id/1.0.0'
      ]
    })

    await expect(table.find(peer1.id)).to.eventually.be.undefined()
    await expect(table.find(peer2.id)).to.eventually.be.undefined()

    await stop(table)

    components.peerStore.all = async () => [peer1, peer2]

    await start(table)

    await expect(table.find(peer1.id)).to.eventually.be.ok()
    await expect(table.find(peer2.id)).to.eventually.be.undefined()
  })
})
