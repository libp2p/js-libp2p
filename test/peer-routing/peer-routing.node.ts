/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import nock from 'nock'
import sinon from 'sinon'
import intoStream from 'into-stream'
import delay from 'delay'
import pDefer from 'p-defer'
import pWaitFor from 'p-wait-for'
import drain from 'it-drain'
import all from 'it-all'
import { create as createIpfsHttpClient } from 'ipfs-http-client'
import { DelegatedPeerRouting } from '@libp2p/delegated-peer-routing'
import { Multiaddr } from '@multiformats/multiaddr'
import { createNode, createPeerId, populateAddressBooks } from '../utils/creators/peer.js'
import type { Libp2pNode } from '../../src/libp2p.js'
import { createBaseOptions } from '../utils/base-options.js'
import { createRoutingOptions } from './utils.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { EventTypes, MessageType } from '@libp2p/interfaces/dht'
import { peerIdFromString } from '@libp2p/peer-id'
import type { PeerData } from '@libp2p/interfaces/peer-data'
import { KadDHT } from '@libp2p/kad-dht'

describe('peer-routing', () => {
  let peerId: PeerId

  beforeEach(async () => {
    peerId = await createEd25519PeerId()
  })

  describe('no routers', () => {
    let node: Libp2pNode

    before(async () => {
      node = await createNode({
        config: createBaseOptions()
      })
    })

    after(async () => await node.stop())

    it('.findPeer should return an error', async () => {
      await expect(node.peerRouting.findPeer(peerId))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_NO_ROUTERS_AVAILABLE')
    })

    it('.getClosestPeers should return an error', async () => {
      try {
        for await (const _ of node.peerRouting.getClosestPeers(peerId.toBytes())) { } // eslint-disable-line
        throw new Error('.getClosestPeers should return an error')
      } catch (err: any) {
        expect(err).to.exist()
        expect(err.code).to.equal('ERR_NO_ROUTERS_AVAILABLE')
      }
    })
  })

  describe('via dht router', () => {
    let nodes: Libp2pNode[]

    before(async () => {
      nodes = await Promise.all([
        createNode({ config: createRoutingOptions() }),
        createNode({ config: createRoutingOptions() }),
        createNode({ config: createRoutingOptions() }),
        createNode({ config: createRoutingOptions() }),
        createNode({ config: createRoutingOptions() })
      ])
      await populateAddressBooks(nodes)

      // Ring dial
      await Promise.all(
        nodes.map(async (peer, i) => await peer.dial(nodes[(i + 1) % nodes.length].peerId))
      )
    })

    after(() => {
      sinon.restore()
    })

    after(async () => await Promise.all(nodes.map(async (n) => await n.stop())))

    it('should use the nodes dht', async () => {
      if (nodes[0].dht == null) {
        throw new Error('DHT not configured')
      }

      const dhtFindPeerStub = sinon.stub(nodes[0].dht, 'findPeer').callsFake(async function * () {
        yield {
          from: nodes[2].peerId,
          type: EventTypes.FINAL_PEER,
          name: 'FINAL_PEER',
          peer: {
            id: nodes[1].peerId,
            multiaddrs: [],
            protocols: []
          }
        }
      })

      expect(dhtFindPeerStub.called).to.be.false()
      await nodes[0].peerRouting.findPeer(nodes[1].peerId)
      expect(dhtFindPeerStub.called).to.be.true()
      dhtFindPeerStub.restore()
    })

    it('should use the nodes dht to get the closest peers', async () => {
      if (nodes[0].dht == null) {
        throw new Error('DHT not configured')
      }

      const dhtGetClosestPeersStub = sinon.stub(nodes[0].dht, 'getClosestPeers').callsFake(async function * () {
        yield {
          from: nodes[2].peerId,
          type: EventTypes.PEER_RESPONSE,
          name: 'PEER_RESPONSE',
          messageName: 'FIND_NODE',
          messageType: MessageType.FIND_NODE,
          closer: [{
            id: nodes[1].peerId,
            multiaddrs: [],
            protocols: []
          }],
          providers: []
        }
      })

      expect(dhtGetClosestPeersStub.called).to.be.false()
      await drain(nodes[0].peerRouting.getClosestPeers(nodes[1].peerId.toBytes()))
      expect(dhtGetClosestPeersStub.called).to.be.true()
      dhtGetClosestPeersStub.restore()
    })

    it('should error when peer tries to find itself', async () => {
      await expect(nodes[0].peerRouting.findPeer(nodes[0].peerId))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_FIND_SELF')
    })

    it('should handle error thrown synchronously during find peer', async () => {
      const unknownPeer = await createPeerId()

      // @ts-expect-error private field
      nodes[0].peerRouting.routers = [{
        findPeer () {
          throw new Error('Thrown sync')
        }
      }]

      await expect(nodes[0].peerRouting.findPeer(unknownPeer))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_NOT_FOUND')
    })

    it('should handle error thrown asynchronously during find peer', async () => {
      const unknownPeer = await createPeerId()

      // @ts-expect-error private field
      nodes[0].peerRouting.routers = [{
        async findPeer () {
          throw new Error('Thrown async')
        }
      }]

      await expect(nodes[0].peerRouting.findPeer(unknownPeer))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_NOT_FOUND')
    })

    it('should handle error thrown asynchronously after delay during find peer', async () => {
      const unknownPeer = await createPeerId()

      // @ts-expect-error private field
      nodes[0].peerRouting.routers = [{
        async findPeer () {
          await delay(100)
          throw new Error('Thrown async after delay')
        }
      }]

      await expect(nodes[0].peerRouting.findPeer(unknownPeer))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_NOT_FOUND')
    })

    it('should return value when one router errors synchronously and another returns a value', async () => {
      const peer = await createPeerId()

      // @ts-expect-error private field
      nodes[0].peerRouting.routers = [{
        findPeer () {
          throw new Error('Thrown sync')
        }
      }, {
        async findPeer () {
          return await Promise.resolve({
            id: peer,
            multiaddrs: []
          })
        }
      }]

      await expect(nodes[0].peerRouting.findPeer(peer))
        .to.eventually.deep.equal({
          id: peer,
          multiaddrs: []
        })
    })

    it('should return value when one router errors asynchronously and another returns a value', async () => {
      const peer = await createPeerId()

      // @ts-expect-error private field
      nodes[0].peerRouting.routers = [{
        async findPeer () {
          throw new Error('Thrown sync')
        }
      }, {
        async findPeer () {
          return await Promise.resolve({
            id: peer,
            multiaddrs: []
          })
        }
      }]

      await expect(nodes[0].peerRouting.findPeer(peer))
        .to.eventually.deep.equal({
          id: peer,
          multiaddrs: []
        })
    })
  })

  describe('via delegate router', () => {
    let node: Libp2pNode
    let delegate: DelegatedPeerRouting

    beforeEach(async () => {
      delegate = new DelegatedPeerRouting(createIpfsHttpClient({
        host: '0.0.0.0',
        protocol: 'http',
        port: 60197
      }))

      node = await createNode({
        config: createBaseOptions({
          peerRouters: [delegate]
        })
      })
    })

    afterEach(() => {
      nock.cleanAll()
      sinon.restore()
    })

    afterEach(async () => await node.stop())

    it('should only have one router', () => {
      // @ts-expect-error private field
      expect(node.peerRouting.routers).to.have.lengthOf(1)
    })

    it('should use the delegate router to find peers', async () => {
      const remotePeerId = await createPeerId()

      const delegateFindPeerStub = sinon.stub(delegate, 'findPeer').callsFake(async function () {
        return {
          id: remotePeerId,
          multiaddrs: [],
          protocols: []
        }
      })

      expect(delegateFindPeerStub.called).to.be.false()
      await node.peerRouting.findPeer(remotePeerId)
      expect(delegateFindPeerStub.called).to.be.true()
      delegateFindPeerStub.restore()
    })

    it('should use the delegate router to get the closest peers', async () => {
      const remotePeerId = await createPeerId()

      const delegateGetClosestPeersStub = sinon.stub(delegate, 'getClosestPeers').callsFake(async function * () {
        yield {
          id: remotePeerId,
          multiaddrs: [],
          protocols: []
        }
      })

      expect(delegateGetClosestPeersStub.called).to.be.false()
      await drain(node.peerRouting.getClosestPeers(remotePeerId.toBytes()))
      expect(delegateGetClosestPeersStub.called).to.be.true()
      delegateGetClosestPeersStub.restore()
    })

    it('should be able to find a peer', async () => {
      const peerKey = peerIdFromString('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')
      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/findpeer')
        .query(true)
        .reply(200, `{"Extra":"","ID":"some other id","Responses":null,"Type":0}\n{"Extra":"","ID":"","Responses":[{"Addrs":["/ip4/127.0.0.1/tcp/4001"],"ID":"${peerKey.toString()}"}],"Type":2}\n`, [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])

      const peer = await node.peerRouting.findPeer(peerKey)

      expect(peer.id.toString()).to.equal(peerKey.toString())
      expect(mockApi.isDone()).to.equal(true)
    })

    it('should error when peer tries to find itself', async () => {
      await expect(node.peerRouting.findPeer(node.peerId))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_FIND_SELF')
    })

    it('should error when a peer cannot be found', async () => {
      const peerId = await createEd25519PeerId()
      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/findpeer')
        .query(true)
        .reply(200, '{"Extra":"","ID":"some other id","Responses":null,"Type":6}\n{"Extra":"","ID":"yet another id","Responses":null,"Type":0}\n{"Extra":"routing:not found","ID":"","Responses":null,"Type":3}\n', [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])

      await expect(node.peerRouting.findPeer(peerId))
        .to.eventually.be.rejected()

      expect(mockApi.isDone()).to.equal(true)
    })

    it('should handle errors from the api', async () => {
      const peerId = await createEd25519PeerId()
      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/findpeer')
        .query(true)
        .reply(502)

      await expect(node.peerRouting.findPeer(peerId))
        .to.eventually.be.rejected()

      expect(mockApi.isDone()).to.equal(true)
    })

    it('should be able to get the closest peers', async () => {
      const peerId = await createEd25519PeerId()
      const closest1 = '12D3KooWLewYMMdGWAtuX852n4rgCWkK7EBn4CWbwwBzhsVoKxk3'
      const closest2 = '12D3KooWDtoQbpKhtnWddfj72QmpFvvLDTsBLTFkjvgQm6cde2AK'

      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/query')
        .query(true)
        .reply(200,
          () => intoStream([
            `{"Extra":"","id":"${closest1}","Responses":[{"ID":"${closest1}","Addrs":["/ip4/127.0.0.1/tcp/63930","/ip4/127.0.0.1/tcp/63930"]}],"Type":1}\n`,
            `{"Extra":"","id":"${closest2}","Responses":[{"ID":"${closest2}","Addrs":["/ip4/127.0.0.1/tcp/63506","/ip4/127.0.0.1/tcp/63506"]}],"Type":1}\n`,
            `{"Extra":"","ID":"${closest2}","Responses":[],"Type":2}\n`,
            `{"Extra":"","ID":"${closest1}","Responses":[],"Type":2}\n`
          ]),
          [
            'Content-Type', 'application/json',
            'X-Chunked-Output', '1'
          ])

      const closestPeers = await all(node.peerRouting.getClosestPeers(peerId.toBytes()))

      expect(closestPeers).to.have.length(2)
      expect(closestPeers[0].id.toString()).to.equal(closest1)
      expect(closestPeers[0].multiaddrs).to.have.lengthOf(2)
      expect(closestPeers[1].id.toString()).to.equal(closest2)
      expect(closestPeers[1].multiaddrs).to.have.lengthOf(2)
      expect(mockApi.isDone()).to.equal(true)
    })

    it('should handle errors when getting the closest peers', async () => {
      const peerId = await createEd25519PeerId()

      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/query')
        .query(true)
        .reply(502, 'Bad Gateway', [
          'X-Chunked-Output', '1'
        ])

      await expect(drain(node.peerRouting.getClosestPeers(peerId.toBytes()))).to.eventually.be.rejected()

      expect(mockApi.isDone()).to.equal(true)
    })
  })

  describe('via dht and delegate routers', () => {
    let node: Libp2pNode
    let delegate: DelegatedPeerRouting

    beforeEach(async () => {
      delegate = new DelegatedPeerRouting(createIpfsHttpClient({
        host: '0.0.0.0',
        protocol: 'http',
        port: 60197
      }))

      node = await createNode({
        config: createRoutingOptions({
          peerRouters: [delegate],
          dht: new KadDHT()
        })
      })
    })

    afterEach(() => {
      sinon.restore()
    })

    afterEach(async () => await node.stop())

    it('should use the delegate if the dht fails to find the peer', async () => {
      const remotePeerId = await createPeerId()
      const results = {
        id: remotePeerId,
        multiaddrs: [],
        protocols: []
      }

      if (node.dht == null) {
        throw new Error('DHT not configured')
      }

      sinon.stub(node.dht, 'findPeer').callsFake(async function * () {})
      sinon.stub(delegate, 'findPeer').callsFake(async () => {
        return results
      })

      const peer = await node.peerRouting.findPeer(remotePeerId)
      expect(peer).to.eql(results)
    })

    it('should not wait for the dht to return if the delegate does first', async () => {
      const remotePeerId = await createPeerId()
      const results = {
        id: remotePeerId,
        multiaddrs: [],
        protocols: []
      }

      if (node.dht == null) {
        throw new Error('DHT not configured')
      }

      const defer = pDefer()

      sinon.stub(node.dht, 'findPeer').callsFake(async function * () {
        yield {
          name: 'SENDING_QUERY',
          type: EventTypes.SENDING_QUERY,
          to: remotePeerId,
          messageName: 'FIND_NODE',
          messageType: MessageType.FIND_NODE
        }
        await defer.promise
      })
      sinon.stub(delegate, 'findPeer').callsFake(async () => {
        return results
      })

      const peer = await node.peerRouting.findPeer(remotePeerId)
      expect(peer).to.eql(results)

      defer.resolve()
    })

    it('should not wait for the delegate to return if the dht does first', async () => {
      const remotePeerId = await createPeerId()
      const result = {
        id: remotePeerId,
        multiaddrs: [],
        protocols: []
      }

      if (node.dht == null) {
        throw new Error('DHT not configured')
      }

      const defer = pDefer<PeerData>()

      sinon.stub(node.dht, 'findPeer').callsFake(async function * () {
        yield {
          from: remotePeerId,
          name: 'FINAL_PEER',
          type: EventTypes.FINAL_PEER,
          peer: result
        }
      })
      sinon.stub(delegate, 'findPeer').callsFake(async () => {
        return await defer.promise
      })

      const peer = await node.peerRouting.findPeer(remotePeerId)
      expect(peer).to.eql(result)

      defer.resolve(result)
    })

    it('should store the addresses of the found peer', async () => {
      const remotePeerId = await createPeerId()
      const result = {
        id: remotePeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/38982')
        ],
        protocols: []
      }

      if (node.dht == null) {
        throw new Error('DHT not configured')
      }

      const spy = sinon.spy(node.peerStore.addressBook, 'add')

      sinon.stub(node.dht, 'findPeer').callsFake(async function * () {
        yield {
          from: remotePeerId,
          name: 'FINAL_PEER',
          type: EventTypes.FINAL_PEER,
          peer: result
        }
      })
      sinon.stub(delegate, 'findPeer').callsFake(async () => {
        const deferred = pDefer<PeerData>()

        return await deferred.promise
      })

      await node.peerRouting.findPeer(remotePeerId)

      expect(spy.calledWith(result.id, result.multiaddrs)).to.be.true()
    })

    it('should use the delegate if the dht fails to get the closest peer', async () => {
      const remotePeerId = await createPeerId()
      const results = [{
        id: remotePeerId,
        multiaddrs: [],
        protocols: []
      }]

      if (node.dht == null) {
        throw new Error('DHT not configured')
      }

      sinon.stub(node.dht, 'getClosestPeers').callsFake(async function * () { })

      sinon.stub(delegate, 'getClosestPeers').callsFake(async function * () {
        yield results[0]
      })

      const closest = await all(node.peerRouting.getClosestPeers(remotePeerId.toBytes()))

      expect(closest).to.have.length.above(0)
      expect(closest).to.eql(results)
    })

    it('should store the addresses of the closest peer', async () => {
      const remotePeerId = await createPeerId()
      const result = {
        id: remotePeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/38982')
        ],
        protocols: []
      }

      if (node.dht == null) {
        throw new Error('DHT not configured')
      }

      const spy = sinon.spy(node.peerStore.addressBook, 'add')

      sinon.stub(node.dht, 'getClosestPeers').callsFake(async function * () { })

      sinon.stub(delegate, 'getClosestPeers').callsFake(async function * () {
        yield result
      })

      await drain(node.peerRouting.getClosestPeers(remotePeerId.toBytes()))

      expect(spy.calledWith(result.id, result.multiaddrs)).to.be.true()
    })

    it('should dedupe closest peers', async () => {
      const remotePeerId = await createPeerId()
      const results = [{
        id: remotePeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/38982')
        ],
        protocols: []
      }]

      if (node.dht == null) {
        throw new Error('DHT not configured')
      }

      sinon.stub(node.dht, 'getClosestPeers').callsFake(async function * () {
        for (const peer of results) {
          yield {
            from: remotePeerId,
            name: 'FINAL_PEER',
            type: EventTypes.FINAL_PEER,
            peer
          }
        }
      })

      sinon.stub(delegate, 'getClosestPeers').callsFake(async function * () {
        yield * results
      })

      const peers = await all(node.peerRouting.getClosestPeers(remotePeerId.toBytes()))

      expect(peers).to.be.an('array').with.a.lengthOf(1).that.deep.equals(results)
    })
  })

  describe('peer routing refresh manager service', () => {
    let node: Libp2pNode
    let peerIds: PeerId[]

    before(async () => {
      peerIds = await Promise.all([
        createPeerId(),
        createPeerId()
      ])
    })

    afterEach(async () => {
      sinon.restore()

      if (node != null) {
        await node.stop()
      }
    })

    it('should be enabled and start by default', async () => {
      const results: PeerData[] = [
        { id: peerIds[0], multiaddrs: [new Multiaddr('/ip4/30.0.0.1/tcp/2000')], protocols: [] },
        { id: peerIds[1], multiaddrs: [new Multiaddr('/ip4/32.0.0.1/tcp/2000')], protocols: [] }
      ]

      node = await createNode({
        config: createRoutingOptions({
          peerRouting: {
            refreshManager: {
              enabled: true,
              bootDelay: 100
            }
          }
        }),
        started: false
      })

      if (node.dht == null) {
        throw new Error('DHT not configured')
      }

      const peerStoreAddressBookAddStub = sinon.spy(node.peerStore.addressBook, 'add')
      const dhtGetClosestPeersStub = sinon.stub(node.dht, 'getClosestPeers').callsFake(async function * () {
        yield {
          name: 'PEER_RESPONSE',
          type: EventTypes.PEER_RESPONSE,
          messageName: 'FIND_NODE',
          messageType: MessageType.FIND_NODE,
          from: peerIds[0],
          closer: [
            results[0]
          ],
          providers: []
        }
        yield {
          name: 'PEER_RESPONSE',
          type: EventTypes.PEER_RESPONSE,
          messageName: 'FIND_NODE',
          messageType: MessageType.FIND_NODE,
          from: peerIds[0],
          closer: [
            results[1]
          ],
          providers: []
        }
      })

      await node.start()

      await pWaitFor(() => dhtGetClosestPeersStub.callCount === 1)
      await pWaitFor(() => peerStoreAddressBookAddStub.callCount === results.length)

      const call0 = peerStoreAddressBookAddStub.getCall(0)
      expect(call0.args[0].equals(results[0].id))
      call0.args[1].forEach((m, index) => {
        expect(m.equals(results[0].multiaddrs[index]))
      })

      const call1 = peerStoreAddressBookAddStub.getCall(1)
      expect(call1.args[0].equals(results[1].id))
      call0.args[1].forEach((m, index) => {
        expect(m.equals(results[1].multiaddrs[index]))
      })
    })

    it('should support being disabled', async () => {
      node = await createNode({
        config: createRoutingOptions({
          peerRouting: {
            refreshManager: {
              bootDelay: 100,
              enabled: false
            }
          }
        }),
        started: false
      })

      if (node.dht == null) {
        throw new Error('DHT not configured')
      }

      const dhtGetClosestPeersStub = sinon.stub(node.dht, 'getClosestPeers').callsFake(async function * () {
        yield {
          name: 'SENDING_QUERY',
          type: EventTypes.SENDING_QUERY,
          to: peerIds[0],
          messageName: 'FIND_NODE',
          messageType: MessageType.FIND_NODE
        }
        throw new Error('should not be called')
      })

      await node.start()
      await delay(100)

      expect(dhtGetClosestPeersStub.callCount === 0)
    })

    it('should start and run on interval', async () => {
      node = await createNode({
        config: createRoutingOptions({
          peerRouting: {
            refreshManager: {
              interval: 500,
              bootDelay: 200
            }
          }
        }),
        started: false
      })

      if (node.dht == null) {
        throw new Error('DHT not configured')
      }

      const dhtGetClosestPeersStub = sinon.stub(node.dht, 'getClosestPeers').callsFake(async function * () {
        yield {
          name: 'PEER_RESPONSE',
          type: EventTypes.PEER_RESPONSE,
          messageName: 'FIND_NODE',
          messageType: MessageType.FIND_NODE,
          from: peerIds[0],
          closer: [
            { id: peerIds[0], multiaddrs: [new Multiaddr('/ip4/30.0.0.1/tcp/2000')], protocols: [] }
          ],
          providers: []
        }
      })

      await node.start()

      // should run more than once
      await pWaitFor(() => dhtGetClosestPeersStub.callCount === 2)
    })
  })
})
