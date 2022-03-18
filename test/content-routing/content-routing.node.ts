/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import nock from 'nock'
import sinon from 'sinon'
import pDefer from 'p-defer'
import { CID } from 'multiformats/cid'
import { create as createIpfsHttpClient } from 'ipfs-http-client'
import { DelegatedContentRouting } from '@libp2p/delegated-content-routing'
import { Multiaddr } from '@multiformats/multiaddr'
import drain from 'it-drain'
import all from 'it-all'
import { createNode, createPeerId, populateAddressBooks } from '../utils/creators/peer.js'
import { createBaseOptions } from '../utils/base-options.js'
import { createRoutingOptions } from './utils.js'
import type { Libp2p } from '../../src/index.js'
import type { PeerData } from '@libp2p/interfaces/peer-data'
import type { Libp2pNode } from '../../src/libp2p.js'

describe('content-routing', () => {
  describe('no routers', () => {
    let node: Libp2p

    before(async () => {
      node = await createNode({
        config: createBaseOptions()
      })
    })

    after(() => node.stop())

    it('.findProviders should return an error', async () => {
      try {
        // @ts-expect-error invalid params
        for await (const _ of node.contentRouting.findProviders('a cid')) {} // eslint-disable-line
        throw new Error('.findProviders should return an error')
      } catch (err: any) {
        expect(err).to.exist()
        expect(err.code).to.equal('ERR_NO_ROUTERS_AVAILABLE')
      }
    })

    it('.provide should return an error', async () => {
      // @ts-expect-error invalid params
      await expect(node.contentRouting.provide('a cid'))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_NO_ROUTERS_AVAILABLE')
    })
  })

  describe('via dht router', () => {
    const number = 5
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
        nodes.map(async (peer, i) => await peer.dial(nodes[(i + 1) % number].peerId))
      )
    })

    afterEach(() => {
      sinon.restore()
    })

    after(async () => await Promise.all(nodes.map(async (n) => await n.stop())))

    it('should use the nodes dht to provide', async () => {
      const deferred = pDefer()

      if (nodes[0].dht == null) {
        throw new Error('DHT was not configured')
      }

      sinon.stub(nodes[0].dht, 'provide').callsFake(async function * () { // eslint-disable-line require-yield
        deferred.resolve()
      })

      void nodes[0].contentRouting.provide(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB'))

      return await deferred.promise
    })

    it('should use the nodes dht to find providers', async () => {
      const deferred = pDefer()

      if (nodes[0].dht == null) {
        throw new Error('DHT was not configured')
      }

      sinon.stub(nodes[0].dht, 'findProviders').callsFake(async function * () {
        yield {
          from: nodes[0].peerId,
          type: 0,
          name: 'PROVIDER',
          providers: [{
            id: nodes[0].peerId,
            multiaddrs: [],
            protocols: []
          }]
        }
        deferred.resolve()
      })

      await drain(nodes[0].contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')))

      return await deferred.promise
    })
  })

  describe('via delegate router', () => {
    let node: Libp2pNode
    let delegate: DelegatedContentRouting

    beforeEach(async () => {
      delegate = new DelegatedContentRouting(createIpfsHttpClient({
        host: '0.0.0.0',
        protocol: 'http',
        port: 60197
      }))

      node = await createNode({
        config: createBaseOptions({
          contentRouters: [
            delegate
          ],
          dht: undefined
        })
      })
    })

    afterEach(async () => {
      if (node != null) {
        await node.stop()
      }

      sinon.restore()
    })

    it('should use the delegate router to provide', async () => {
      const deferred = pDefer()

      sinon.stub(delegate, 'provide').callsFake(async () => {
        deferred.resolve()
      })

      void node.contentRouting.provide(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB'))

      return await deferred.promise
    })

    it('should use the delegate router to find providers', async () => {
      const deferred = pDefer()

      sinon.stub(delegate, 'findProviders').callsFake(async function * () {
        yield {
          id: node.peerId,
          multiaddrs: [],
          protocols: []
        }
        deferred.resolve()
      })

      await drain(node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')))

      return await deferred.promise
    })

    it('should be able to register as a provider', async () => {
      const cid = CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')
      const provider = 'QmZNgCqZCvTsi3B4Vt7gsSqpkqDpE7M2Y9TDmEhbDb4ceF'

      const mockBlockApi = nock('http://0.0.0.0:60197')
        // mock the block/stat call
        .post('/api/v0/block/stat')
        .query(true)
        .reply(200, '{"Key":"QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB","Size":"2169"}', [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])
      const mockDhtApi = nock('http://0.0.0.0:60197')
        // mock the dht/provide call
        .post('/api/v0/dht/provide')
        .query(true)
        .reply(200, `{"Extra":"","ID":"QmWKqWXCtRXEeCQTo3FoZ7g4AfnGiauYYiczvNxFCHicbB","Responses":[{"Addrs":["/ip4/0.0.0.0/tcp/0"],"ID":"${provider}"}],"Type":4}\n`, [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])

      await node.contentRouting.provide(cid)

      expect(mockBlockApi.isDone()).to.equal(true)
      expect(mockDhtApi.isDone()).to.equal(true)
    })

    it('should handle errors when registering as a provider', async () => {
      const cid = CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')
      const mockApi = nock('http://0.0.0.0:60197')
        // mock the block/stat call
        .post('/api/v0/block/stat')
        .query(true)
        .reply(502, 'Bad Gateway', ['Content-Type', 'application/json'])

      await expect(node.contentRouting.provide(cid))
        .to.eventually.be.rejected()

      expect(mockApi.isDone()).to.equal(true)
    })

    it('should be able to find providers', async () => {
      const cid = CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')
      const provider = 'QmZNgCqZCvTsi3B4Vt7gsSqpkqDpE7M2Y9TDmEhbDb4ceF'

      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/findprovs')
        .query(true)
        .reply(200, `{"Extra":"","ID":"QmWKqWXCtRXEeCQTo3FoZ7g4AfnGiauYYiczvNxFCHicbB","Responses":[{"Addrs":["/ip4/0.0.0.0/tcp/0"],"ID":"${provider}"}],"Type":4}\n`, [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])

      const providers = await all(node.contentRouting.findProviders(cid))

      expect(providers).to.have.length(1)
      expect(providers[0].id.toString()).to.equal(provider)
      expect(mockApi.isDone()).to.equal(true)
    })

    it('should handle errors when finding providers', async () => {
      const cid = CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')
      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/findprovs')
        .query(true)
        .reply(502, 'Bad Gateway', [
          'X-Chunked-Output', '1'
        ])

      try {
        for await (const _ of node.contentRouting.findProviders(cid)) { } // eslint-disable-line
        throw new Error('should handle errors when finding providers')
      } catch (err: any) {
        expect(err).to.exist()
      }

      expect(mockApi.isDone()).to.equal(true)
    })
  })

  describe('via dht and delegate routers', () => {
    let node: Libp2pNode
    let delegate: DelegatedContentRouting

    beforeEach(async () => {
      delegate = new DelegatedContentRouting(createIpfsHttpClient({
        host: '0.0.0.0',
        protocol: 'http',
        port: 60197
      }))

      node = await createNode({
        config: createRoutingOptions({
          contentRouters: [delegate]
        })
      })
    })

    afterEach(() => {
      sinon.restore()
    })

    afterEach(async () => await node.stop())

    it('should store the multiaddrs of a peer', async () => {
      const providerPeerId = await createPeerId()
      const result: PeerData = {
        id: providerPeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/49320')
        ],
        protocols: []
      }

      if (node.dht == null) {
        throw new Error('DHT was not configured')
      }

      sinon.stub(node.dht, 'findProviders').callsFake(async function * () {})
      sinon.stub(delegate, 'findProviders').callsFake(async function * () {
        yield result
      })

      expect(await node.peerStore.has(providerPeerId)).to.not.be.ok()

      await drain(node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')))

      expect(await node.peerStore.addressBook.get(providerPeerId)).to.deep.include({
        isCertified: false,
        multiaddr: result.multiaddrs[0]
      })
    })

    it('should not wait for routing findProviders to finish before returning results', async () => {
      const providerPeerId = await createPeerId()
      const result = {
        id: providerPeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/49320')
        ],
        protocols: []
      }

      if (node.dht == null) {
        throw new Error('DHT was not configured')
      }

      const defer = pDefer()

      sinon.stub(node.dht, 'findProviders').callsFake(async function * () { // eslint-disable-line require-yield
        await defer.promise
      })
      sinon.stub(delegate, 'findProviders').callsFake(async function * () {
        yield result

        await defer.promise
      })

      for await (const provider of node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB'))) {
        expect(provider.id).to.deep.equal(providerPeerId)
        defer.resolve()
      }
    })

    it('should dedupe results', async () => {
      const providerPeerId = await createPeerId()
      const result = {
        id: providerPeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/49320')
        ],
        protocols: []
      }

      if (node.dht == null) {
        throw new Error('DHT was not configured')
      }

      sinon.stub(node.dht, 'findProviders').callsFake(async function * () {
        yield {
          from: providerPeerId,
          type: 0,
          name: 'PROVIDER',
          providers: [
            result
          ]
        }
      })
      sinon.stub(delegate, 'findProviders').callsFake(async function * () {
        yield result
      })

      const results = await all(node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')))

      expect(results).to.be.an('array').with.lengthOf(1).that.deep.equals([result])
    })

    it('should combine multiaddrs when different addresses are returned by different content routers', async () => {
      const providerPeerId = await createPeerId()
      const result1 = {
        id: providerPeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/49320')
        ],
        protocols: []
      }
      const result2 = {
        id: providerPeerId,
        multiaddrs: [
          new Multiaddr('/ip4/213.213.213.213/tcp/2344')
        ],
        protocols: []
      }

      if (node.dht == null) {
        throw new Error('DHT was not configured')
      }

      sinon.stub(node.dht, 'findProviders').callsFake(async function * () {
        yield {
          from: providerPeerId,
          type: 0,
          name: 'PROVIDER',
          providers: [
            result1
          ]
        }
      })
      sinon.stub(delegate, 'findProviders').callsFake(async function * () {
        yield result2
      })

      await drain(node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')))

      expect(await node.peerStore.addressBook.get(providerPeerId)).to.deep.include({
        isCertified: false,
        multiaddr: result1.multiaddrs[0]
      }).and.to.deep.include({
        isCertified: false,
        multiaddr: result2.multiaddrs[0]
      })
    })

    it('should use both the dht and delegate router to provide', async () => {
      const dhtDeferred = pDefer()
      const delegatedDeferred = pDefer()

      if (node.dht == null) {
        throw new Error('DHT was not configured')
      }

      sinon.stub(node.dht, 'provide').callsFake(async function * () { // eslint-disable-line require-yield
        dhtDeferred.resolve()
      })

      sinon.stub(delegate, 'provide').callsFake(async function () {
        delegatedDeferred.resolve()
      })

      await node.contentRouting.provide(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB'))

      await Promise.all([
        dhtDeferred.promise,
        delegatedDeferred.promise
      ])
    })

    it('should use the dht if the delegate fails to find providers', async () => {
      const providerPeerId = await createPeerId()
      const results = [{
        id: providerPeerId,
        multiaddrs: [],
        protocols: []
      }]

      if (node.dht == null) {
        throw new Error('DHT was not configured')
      }

      sinon.stub(node.dht, 'findProviders').callsFake(async function * () {
        yield {
          from: providerPeerId,
          type: 0,
          name: 'PROVIDER',
          providers: [
            results[0]
          ]
        }
      })

      sinon.stub(delegate, 'findProviders').callsFake(async function * () { // eslint-disable-line require-yield
      })

      const providers = []
      for await (const prov of node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB'))) {
        providers.push(prov)
      }

      expect(providers).to.have.length.above(0)
      expect(providers).to.eql(results)
    })

    it('should use the delegate if the dht fails to find providers', async () => {
      const providerPeerId = await createPeerId()
      const results = [{
        id: providerPeerId,
        multiaddrs: [],
        protocols: []
      }]

      if (node.dht == null) {
        throw new Error('DHT was not configured')
      }

      sinon.stub(node.dht, 'findProviders').callsFake(async function * () {})

      sinon.stub(delegate, 'findProviders').callsFake(async function * () {
        yield results[0]
      })

      const providers = []
      for await (const prov of node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB'))) {
        providers.push(prov)
      }

      expect(providers).to.have.length.above(0)
      expect(providers).to.eql(results)
    })
  })
})
