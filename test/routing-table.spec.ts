/* eslint-env mocha */

import { expect } from 'aegir/chai'
import random from 'lodash.random'
import sinon from 'sinon'
import { KAD_CLOSE_TAG_NAME, KAD_CLOSE_TAG_VALUE, KBUCKET_SIZE, RoutingTable, RoutingTableComponents } from '../src/routing-table/index.js'
import * as kadUtils from '../src/utils.js'
import { createPeerId, createPeerIds } from './utils/create-peer-id.js'
import { PROTOCOL_DHT } from '../src/constants.js'
import { peerIdFromString } from '@libp2p/peer-id'
import { mockConnectionManager } from '@libp2p/interface-mocks'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { sortClosestPeers } from './utils/sort-closest-peers.js'
import pWaitFor from 'p-wait-for'
import { pipe } from 'it-pipe'
import all from 'it-all'
import { PeerSet } from '@libp2p/peer-collections'
import { stubInterface } from 'ts-sinon'
import type { Registrar } from '@libp2p/interface-registrar'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerStore } from '@libp2p/interface-peer-store'
import { MemoryDatastore } from 'datastore-core'
import { EventEmitter } from '@libp2p/interfaces/events'
import type { Libp2pEvents } from '@libp2p/interface-libp2p'

describe('Routing Table', () => {
  let table: RoutingTable
  let components: RoutingTableComponents

  beforeEach(async function () {
    this.timeout(20 * 1000)

    const events = new EventEmitter<Libp2pEvents>()

    components = {
      peerId: await createPeerId(),
      connectionManager: stubInterface<ConnectionManager>(),
      peerStore: stubInterface<PeerStore>()
    }
    components.connectionManager = mockConnectionManager({
      ...components,
      registrar: stubInterface<Registrar>(),
      events
    })
    components.peerStore = new PersistentPeerStore({
      ...components,
      datastore: new MemoryDatastore(),
      events
    })

    table = new RoutingTable(components, {
      lan: false,
      protocol: PROTOCOL_DHT
    })
    await table.start()
  })

  afterEach(async () => {
    await table.stop()
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

  it('remove', async function () {
    this.timeout(20 * 1000)

    const peers = await createPeerIds(10)
    await Promise.all(peers.map(async (peer) => { await table.add(peer) }))

    const key = await kadUtils.convertPeerId(peers[2])
    expect(table.closestPeers(key, 10)).to.have.length(10)

    await table.remove(peers[5])
    expect(table.closestPeers(key, 10)).to.have.length(9)
    expect(table.size).to.be.eql(9)
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
    let fn: (() => Promise<any>) | undefined

    // execute queued functions immediately
    // @ts-expect-error incomplete implementation
    table.pingQueue = {
      add: async (f: () => Promise<any>) => {
        fn = f
      },
      clear: () => {}
    }

    const peerIds = [
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi5'),
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi6')
    ]

    const oldPeer = {
      id: peerIds[0].toBytes(),
      peer: peerIds[0]
    }
    const newPeer = {
      id: peerIds[1].toBytes(),
      peer: peerIds[1]
    }

    table._onPing([oldPeer], newPeer)

    if (table.kb == null) {
      throw new Error('kbucket not defined')
    }

    // add the old peer
    table.kb.add(oldPeer)

    // simulate connection succeeding
    const newStreamStub = sinon.stub().withArgs(PROTOCOL_DHT).resolves({ close: sinon.stub() })
    const openConnectionStub = sinon.stub().withArgs(oldPeer.peer).resolves({
      newStream: newStreamStub
    })
    components.connectionManager.openConnection = openConnectionStub

    if (fn == null) {
      throw new Error('nothing added to queue')
    }

    // perform the ping
    await fn()

    expect(openConnectionStub.calledOnce).to.be.true()
    expect(openConnectionStub.calledWith(oldPeer.peer)).to.be.true()

    expect(newStreamStub.callCount).to.equal(1)
    expect(newStreamStub.calledWith(PROTOCOL_DHT)).to.be.true()

    // did not add the new peer
    expect(table.kb.get(newPeer.id)).to.be.null()

    // kept the old peer
    expect(table.kb.get(oldPeer.id)).to.not.be.null()
  })

  it('evicts oldest peer that does not respond to ping', async () => {
    let fn: (() => Promise<any>) | undefined

    // execute queued functions immediately
    // @ts-expect-error incomplete implementation
    table.pingQueue = {
      add: async (f: () => Promise<any>) => {
        fn = f
      },
      clear: () => {}
    }

    const peerIds = [
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi5'),
      peerIdFromString('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi6')
    ]

    const oldPeer = {
      id: peerIds[0].toBytes(),
      peer: peerIds[0]
    }
    const newPeer = {
      id: peerIds[1].toBytes(),
      peer: peerIds[1]
    }

    table._onPing([oldPeer], newPeer)

    if (table.kb == null) {
      throw new Error('kbucket not defined')
    }

    // add the old peer
    table.kb.add(oldPeer)

    // libp2p fails to dial the old peer
    const openConnectionStub = sinon.stub().withArgs(oldPeer.peer).rejects(new Error('Could not dial peer'))
    components.connectionManager.openConnection = openConnectionStub

    if (fn == null) {
      throw new Error('nothing added to queue')
    }

    // perform the ping
    await fn()

    expect(openConnectionStub.callCount).to.equal(1)
    expect(openConnectionStub.calledWith(oldPeer.peer)).to.be.true()

    // added the new peer
    expect(table.kb.get(newPeer.id)).to.not.be.null()

    // evicted the old peer
    expect(table.kb.get(oldPeer.id)).to.be.null()
  })

  it('tags newly found kad-close peers', async () => {
    const remotePeer = await createEd25519PeerId()
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
        async (source) => await all(source)
      ))
    }

    const tagPeerSpy = sinon.spy(components.peerStore, 'merge')
    const localNodeId = await kadUtils.convertPeerId(components.peerId)
    const sortedPeerList = await sortClosestPeers(
      await Promise.all(
        new Array(KBUCKET_SIZE + 1).fill(0).map(async () => await createEd25519PeerId())
      ),
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
    expect(table.kb?.root.contacts).to.have.lengthOf(KBUCKET_SIZE, 'split root kbucket when we should not have')
    expect(table.kb?.root.left).to.be.null('split root kbucket when we should not have')
    expect(table.kb?.root.right).to.be.null('split root kbucket when we should not have')

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
    expect(table.kb?.root.left).to.not.be.null('did not split root kbucket when we should have')
    expect(table.kb?.root.right).to.not.be.null('did not split root kbucket when we should have')

    // wait for tag new peer and untag old peer
    await pWaitFor(() => {
      return tagPeerSpy.callCount === 2
    })

    // should have updated list of tagged peers
    const finalTaggedPeers = await getTaggedPeers()
    expect(finalTaggedPeers.difference(new PeerSet(sortedPeerList.slice(1)))).to.have.property('size', 0)
  })
})
