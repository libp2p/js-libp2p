/* eslint-env mocha */

import { type KadDHT, EventTypes, MessageType } from '@libp2p/kad-dht'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import drain from 'it-drain'
import pDefer from 'p-defer'
import sinon from 'sinon'
import { type StubbedInstance, stubInterface } from 'sinon-ts'
import { createBaseOptions } from '../utils/base-options.js'
import { createNode, createPeerId, populateAddressBooks } from '../utils/creators/peer.js'
import { createRoutingOptions } from './utils.js'
import type { Libp2pNode } from '../../src/libp2p.js'
import type { Libp2p } from '@libp2p/interface-libp2p'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { PeerRouting } from '@libp2p/interface-peer-routing'

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

    after(async () => { await node.stop() })

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
    let nodes: Array<Libp2p<{ dht: KadDHT }>>

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
        nodes.map(async (peer, i) => peer.dial(nodes[(i + 1) % nodes.length].peerId))
      )
    })

    after(() => {
      sinon.restore()
    })

    after(async () => Promise.all(nodes.map(async (n) => { await n.stop() })))

    it('should use the nodes dht', async () => {
      if (nodes[0].services.dht == null) {
        throw new Error('DHT not configured')
      }

      const dhtFindPeerStub = sinon.stub(nodes[0].services.dht, 'findPeer').callsFake(async function * () {
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
      if (nodes[0].services.dht == null) {
        throw new Error('DHT not configured')
      }

      const dhtGetClosestPeersStub = sinon.stub(nodes[0].services.dht, 'getClosestPeers').callsFake(async function * () {
        yield {
          from: nodes[2].peerId,
          type: EventTypes.FINAL_PEER,
          name: 'FINAL_PEER',
          messageName: 'FIND_NODE',
          messageType: MessageType.FIND_NODE,
          peer: {
            id: nodes[1].peerId,
            multiaddrs: [],
            protocols: []
          }
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
          return Promise.resolve({
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
          return Promise.resolve({
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
    let delegate: StubbedInstance<PeerRouting>

    beforeEach(async () => {
      delegate = stubInterface<PeerRouting>()
      delegate.findPeer.rejects(new Error('Could not find peer'))
      delegate.getClosestPeers.returns(async function * () {}())

      node = await createNode({
        config: createBaseOptions({
          peerRouters: [
            () => delegate
          ]
        })
      })
    })

    afterEach(() => {
      sinon.restore()
    })

    afterEach(async () => { await node.stop() })

    it('should only have one router', () => {
      // @ts-expect-error private field
      expect(node.peerRouting.routers).to.have.lengthOf(1)
    })

    it('should use the delegate router to find peers', async () => {
      const remotePeerId = await createPeerId()

      delegate.findPeer.callsFake(async function () {
        return {
          id: remotePeerId,
          multiaddrs: [],
          protocols: []
        }
      })

      expect(delegate.findPeer.called).to.be.false()
      await node.peerRouting.findPeer(remotePeerId)
      expect(delegate.findPeer.called).to.be.true()
    })

    it('should use the delegate router to get the closest peers', async () => {
      const remotePeerId = await createPeerId()

      delegate.getClosestPeers.callsFake(async function * () {
        yield {
          id: remotePeerId,
          multiaddrs: [],
          protocols: []
        }
      })

      expect(delegate.getClosestPeers.called).to.be.false()
      await drain(node.peerRouting.getClosestPeers(remotePeerId.toBytes()))
      expect(delegate.getClosestPeers.called).to.be.true()
    })

    it('should error when peer tries to find itself', async () => {
      await expect(node.peerRouting.findPeer(node.peerId))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_FIND_SELF')
    })

    it('should handle errors from the delegate when finding closest peers', async () => {
      const remotePeerId = await createPeerId()

      delegate.getClosestPeers.callsFake(async function * () { // eslint-disable-line require-yield
        throw new Error('Could not find closer peers')
      })

      expect(delegate.getClosestPeers.called).to.be.false()
      await expect(drain(node.peerRouting.getClosestPeers(remotePeerId.toBytes())))
        .to.eventually.be.rejectedWith('Could not find closer peers')
    })
  })

  describe('via dht and delegate routers', () => {
    let node: Libp2p<{ dht: KadDHT }>
    let delegate: StubbedInstance<PeerRouting>

    beforeEach(async () => {
      delegate = stubInterface<PeerRouting>()
      delegate.findPeer.throws(new Error('Could not find peer'))
      delegate.getClosestPeers.returns(async function * () {}())

      node = await createNode({
        config: createRoutingOptions({
          peerRouters: [
            () => delegate
          ]
        })
      })
    })

    afterEach(() => {
      sinon.restore()
    })

    afterEach(async () => { await node.stop() })

    it('should use the delegate if the dht fails to find the peer', async () => {
      const remotePeerId = await createPeerId()
      const results = {
        id: remotePeerId,
        multiaddrs: [],
        protocols: []
      }

      if (node.services.dht == null) {
        throw new Error('DHT not configured')
      }

      sinon.stub(node.services.dht, 'findPeer').callsFake(async function * () {})
      delegate.findPeer.reset()
      delegate.findPeer.callsFake(async () => {
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

      if (node.services.dht == null) {
        throw new Error('DHT not configured')
      }

      const defer = pDefer()

      sinon.stub(node.services.dht, 'findPeer').callsFake(async function * () {
        yield {
          name: 'SEND_QUERY',
          type: EventTypes.SEND_QUERY,
          to: remotePeerId,
          messageName: 'FIND_NODE',
          messageType: MessageType.FIND_NODE
        }
        await defer.promise
      })
      delegate.findPeer.reset()
      delegate.findPeer.callsFake(async () => {
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

      if (node.services.dht == null) {
        throw new Error('DHT not configured')
      }

      const defer = pDefer<PeerInfo>()

      sinon.stub(node.services.dht, 'findPeer').callsFake(async function * () {
        yield {
          from: remotePeerId,
          name: 'FINAL_PEER',
          type: EventTypes.FINAL_PEER,
          peer: result
        }
      })
      delegate.findPeer.reset()
      delegate.findPeer.callsFake(async () => {
        return defer.promise
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
          multiaddr('/ip4/123.123.123.123/tcp/38982')
        ],
        protocols: []
      }

      if (node.services.dht == null) {
        throw new Error('DHT not configured')
      }

      const spy = sinon.spy(node.peerStore, 'merge')

      sinon.stub(node.services.dht, 'findPeer').callsFake(async function * () {
        yield {
          from: remotePeerId,
          name: 'FINAL_PEER',
          type: EventTypes.FINAL_PEER,
          peer: result
        }
      })
      delegate.findPeer.reset()
      delegate.findPeer.callsFake(async () => {
        const deferred = pDefer<PeerInfo>()

        return deferred.promise
      })

      await node.peerRouting.findPeer(remotePeerId)

      expect(spy.calledWith(result.id, {
        multiaddrs: result.multiaddrs
      })).to.be.true()
    })

    it('should use the delegate if the dht fails to get the closest peer', async () => {
      const remotePeerId = await createPeerId()
      const results = [{
        id: remotePeerId,
        multiaddrs: [],
        protocols: []
      }]

      if (node.services.dht == null) {
        throw new Error('DHT not configured')
      }

      sinon.stub(node.services.dht, 'getClosestPeers').callsFake(async function * () { })

      delegate.getClosestPeers.callsFake(async function * () {
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
          multiaddr('/ip4/123.123.123.123/tcp/38982')
        ],
        protocols: []
      }

      if (node.services.dht == null) {
        throw new Error('DHT not configured')
      }

      const spy = sinon.spy(node.peerStore, 'merge')

      sinon.stub(node.services.dht, 'getClosestPeers').callsFake(async function * () { })

      delegate.getClosestPeers.callsFake(async function * () {
        yield result
      })

      await drain(node.peerRouting.getClosestPeers(remotePeerId.toBytes()))

      expect(spy.calledWith(result.id, {
        multiaddrs: result.multiaddrs
      })).to.be.true()
    })

    it('should dedupe closest peers', async () => {
      const remotePeerId = await createPeerId()
      const results = [{
        id: remotePeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/38982')
        ],
        protocols: []
      }]

      if (node.services.dht == null) {
        throw new Error('DHT not configured')
      }

      sinon.stub(node.services.dht, 'getClosestPeers').callsFake(async function * () {
        for (const peer of results) {
          yield {
            from: remotePeerId,
            name: 'FINAL_PEER',
            type: EventTypes.FINAL_PEER,
            peer
          }
        }
      })

      delegate.getClosestPeers.callsFake(async function * () {
        yield * results
      })

      const peers = await all(node.peerRouting.getClosestPeers(remotePeerId.toBytes()))

      expect(peers).to.be.an('array').with.a.lengthOf(1).that.deep.equals(results)
    })
  })
})
