'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const nock = require('nock')
const sinon = require('sinon')

const pDefer = require('p-defer')
const mergeOptions = require('merge-options')

const { CID } = require('multiformats/cid')
const ipfsHttpClient = require('ipfs-http-client')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')
const { Multiaddr } = require('multiaddr')
const drain = require('it-drain')
const all = require('it-all')

const peerUtils = require('../utils/creators/peer')
const { baseOptions, routingOptions } = require('./utils')

describe('content-routing', () => {
  describe('no routers', () => {
    let node

    before(async () => {
      [node] = await peerUtils.createPeer({
        config: baseOptions
      })
    })

    after(() => node.stop())

    it('.findProviders should return an error', async () => {
      try {
        for await (const _ of node.contentRouting.findProviders('a cid')) {} // eslint-disable-line
        throw new Error('.findProviders should return an error')
      } catch (err) {
        expect(err).to.exist()
        expect(err.code).to.equal('NO_ROUTERS_AVAILABLE')
      }
    })

    it('.provide should return an error', async () => {
      await expect(node.contentRouting.provide('a cid'))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'NO_ROUTERS_AVAILABLE')
    })
  })

  describe('via dht router', () => {
    const number = 5
    let nodes

    before(async () => {
      nodes = await peerUtils.createPeer({
        number,
        config: routingOptions
      })

      // Ring dial
      await Promise.all(
        nodes.map((peer, i) => peer.dial(nodes[(i + 1) % number].peerId))
      )
    })

    afterEach(() => {
      sinon.restore()
    })

    after(() => Promise.all(nodes.map((n) => n.stop())))

    it('should use the nodes dht to provide', () => {
      const deferred = pDefer()

      sinon.stub(nodes[0]._dht, 'provide').callsFake(() => {
        deferred.resolve()
      })

      nodes[0].contentRouting.provide()
      return deferred.promise
    })

    it('should use the nodes dht to find providers', async () => {
      const deferred = pDefer()
      const [providerPeerId] = await peerUtils.createPeerId({ fixture: false })

      sinon.stub(nodes[0]._dht, 'findProviders').callsFake(function * () {
        deferred.resolve()
        yield {
          id: providerPeerId,
          multiaddrs: []
        }
      })

      await nodes[0].contentRouting.findProviders().next()

      return deferred.promise
    })
  })

  describe('via delegate router', () => {
    let node
    let delegate

    beforeEach(async () => {
      const [peerId] = await peerUtils.createPeerId({ fixture: true })

      delegate = new DelegatedContentRouter(peerId, ipfsHttpClient.create({
        host: '0.0.0.0',
        protocol: 'http',
        port: 60197
      }))

      ;[node] = await peerUtils.createPeer({
        config: mergeOptions(baseOptions, {
          modules: {
            contentRouting: [delegate]
          },
          config: {
            dht: {
              enabled: false
            }
          }
        })
      })
    })

    afterEach(() => {
      sinon.restore()
    })

    afterEach(() => node.stop())

    it('should only have one router', () => {
      expect(node.contentRouting.routers).to.have.lengthOf(1)
    })

    it('should use the delegate router to provide', () => {
      const deferred = pDefer()

      sinon.stub(delegate, 'provide').callsFake(() => {
        deferred.resolve()
      })

      node.contentRouting.provide()
      return deferred.promise
    })

    it('should use the delegate router to find providers', async () => {
      const deferred = pDefer()
      const [providerPeerId] = await peerUtils.createPeerId({ fixture: false })

      sinon.stub(delegate, 'findProviders').callsFake(function * () {
        deferred.resolve()
        yield {
          id: providerPeerId,
          multiaddrs: []
        }
      })

      await node.contentRouting.findProviders().next()

      return deferred.promise
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

      const providers = []
      for await (const provider of node.contentRouting.findProviders(cid, { timeout: 1000 })) {
        providers.push(provider)
      }

      expect(providers).to.have.length(1)
      expect(providers[0].id.toB58String()).to.equal(provider)
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
      } catch (err) {
        expect(err).to.exist()
      }

      expect(mockApi.isDone()).to.equal(true)
    })
  })

  describe('via dht and delegate routers', () => {
    let node
    let delegate

    beforeEach(async () => {
      const [peerId] = await peerUtils.createPeerId({ fixture: true })

      delegate = new DelegatedContentRouter(peerId, ipfsHttpClient.create({
        host: '0.0.0.0',
        protocol: 'http',
        port: 60197
      }))

      ;[node] = await peerUtils.createPeer({
        config: mergeOptions(routingOptions, {
          modules: {
            contentRouting: [delegate]
          }
        })
      })
    })

    afterEach(() => {
      sinon.restore()
    })

    afterEach(() => node.stop())

    it('should store the multiaddrs of a peer', async () => {
      const [providerPeerId] = await peerUtils.createPeerId({ fixture: false })
      const result = {
        id: providerPeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/49320')
        ]
      }

      sinon.stub(node._dht, 'findProviders').callsFake(function * () {})
      sinon.stub(delegate, 'findProviders').callsFake(function * () {
        yield result
      })

      expect(node.peerStore.addressBook.get(providerPeerId)).to.not.be.ok()

      await drain(node.contentRouting.findProviders('a cid'))

      expect(node.peerStore.addressBook.get(providerPeerId)).to.deep.include({
        isCertified: false,
        multiaddr: result.multiaddrs[0]
      })
    })

    it('should not wait for routing findProviders to finish before returning results', async () => {
      const [providerPeerId] = await peerUtils.createPeerId({ fixture: false })
      const result = {
        id: providerPeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/49320')
        ]
      }

      const defer = pDefer()

      sinon.stub(node._dht, 'findProviders').callsFake(async function * () { // eslint-disable-line require-yield
        await defer.promise
      })
      sinon.stub(delegate, 'findProviders').callsFake(async function * () {
        yield result

        await defer.promise
      })

      for await (const provider of node.contentRouting.findProviders('a cid')) {
        expect(provider.id).to.deep.equal(providerPeerId)
        defer.resolve()
      }
    })

    it('should dedupe results', async () => {
      const [providerPeerId] = await peerUtils.createPeerId({ fixture: false })
      const result = {
        id: providerPeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/49320')
        ]
      }

      sinon.stub(node._dht, 'findProviders').callsFake(async function * () {
        yield result
      })
      sinon.stub(delegate, 'findProviders').callsFake(async function * () {
        yield result
      })

      const results = await all(node.contentRouting.findProviders('a cid'))

      expect(results).to.be.an('array').with.lengthOf(1).that.deep.equals([result])
    })

    it('should combine multiaddrs when different addresses are returned by different content routers', async () => {
      const [providerPeerId] = await peerUtils.createPeerId({ fixture: false })
      const result1 = {
        id: providerPeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/49320')
        ]
      }
      const result2 = {
        id: providerPeerId,
        multiaddrs: [
          new Multiaddr('/ip4/213.213.213.213/tcp/2344')
        ]
      }

      sinon.stub(node._dht, 'findProviders').callsFake(async function * () {
        yield result1
      })
      sinon.stub(delegate, 'findProviders').callsFake(async function * () {
        yield result2
      })

      await drain(node.contentRouting.findProviders('a cid'))

      expect(node.peerStore.addressBook.get(providerPeerId)).to.deep.include({
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

      sinon.stub(node._dht, 'provide').callsFake(() => {
        dhtDeferred.resolve()
      })

      sinon.stub(delegate, 'provide').callsFake(() => {
        delegatedDeferred.resolve()
      })

      await node.contentRouting.provide()

      await Promise.all([
        dhtDeferred.promise,
        delegatedDeferred.promise
      ])
    })

    it('should use the dht if the delegate fails to find providers', async () => {
      const [providerPeerId] = await peerUtils.createPeerId({ fixture: false })
      const results = [{
        id: providerPeerId,
        multiaddrs: []
      }]

      sinon.stub(node._dht, 'findProviders').callsFake(function * () {
        yield results[0]
      })

      sinon.stub(delegate, 'findProviders').callsFake(function * () { // eslint-disable-line require-yield
      })

      const providers = []
      for await (const prov of node.contentRouting.findProviders('a cid')) {
        providers.push(prov)
      }

      expect(providers).to.have.length.above(0)
      expect(providers).to.eql(results)
    })

    it('should use the delegate if the dht fails to find providers', async () => {
      const [providerPeerId] = await peerUtils.createPeerId({ fixture: false })
      const results = [{
        id: providerPeerId,
        multiaddrs: []
      }]

      sinon.stub(node._dht, 'findProviders').callsFake(function * () {})

      sinon.stub(delegate, 'findProviders').callsFake(function * () {
        yield results[0]
      })

      const providers = []
      for await (const prov of node.contentRouting.findProviders('a cid')) {
        providers.push(prov)
      }

      expect(providers).to.have.length.above(0)
      expect(providers).to.eql(results)
    })
  })
})
