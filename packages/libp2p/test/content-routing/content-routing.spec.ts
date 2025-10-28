/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { contentRoutingSymbol } from '@libp2p/interface'
import { peerIdFromString, peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import drain from 'it-drain'
import { CID } from 'multiformats/cid'
import pDefer from 'p-defer'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p } from '../../src/index.js'
import type { ContentRouting, Provider } from '@libp2p/interface'
import type { StubbedInstance } from 'sinon-ts'

describe('content-routing', () => {
  describe('no routers', () => {
    let node: Libp2p

    beforeEach(async () => {
      node = await createLibp2p()
    })

    afterEach(async () => {
      await node?.stop()
    })

    it('.findProviders should return an error', async () => {
      try {
        // @ts-expect-error invalid params
        for await (const _ of node.contentRouting.findProviders('a cid')) {} // eslint-disable-line
        throw new Error('.findProviders should return an error')
      } catch (err: any) {
        expect(err).to.exist()
        expect(err.name).to.equal('NoContentRoutersError')
      }
    })

    it('.provide should return an error', async () => {
      // @ts-expect-error invalid params
      await expect(node.contentRouting.provide('a cid'))
        .to.eventually.be.rejected
        .with.property('name', 'NoContentRoutersError')
    })
  })

  describe('via service that implements ContentRouting', () => {
    let node: Libp2p
    let router: StubbedInstance<ContentRouting>

    beforeEach(async () => {
      router = stubInterface<ContentRouting>()

      node = await createLibp2p({
        services: {
          router: () => ({
            [contentRoutingSymbol]: router
          })
        }
      })
    })

    afterEach(async () => {
      await node?.stop()
    })

    it('should use the configured service to provide', async () => {
      const deferred = pDefer()

      router.provide.callsFake(async function () {
        deferred.resolve()
      })

      void node.contentRouting.provide(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB'))

      await deferred.promise
    })

    it('should use the configured service to find providers', async () => {
      const deferred = pDefer()

      router.findProviders.callsFake(async function * () {
        yield {
          id: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
          multiaddrs: [
            multiaddr('/ip4/123.123.123.123/tcp/4001')
          ],
          routing: 'test'
        }
        deferred.resolve()
      })

      await drain(node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')))

      return deferred.promise
    })
  })

  describe('via configured ContentRouter', () => {
    let node: Libp2p
    let delegate: StubbedInstance<ContentRouting>

    beforeEach(async () => {
      delegate = stubInterface<ContentRouting>()
      delegate.provide.returns(Promise.resolve())
      delegate.findProviders.returns(async function * () {}())

      node = await createLibp2p({
        contentRouters: [
          () => delegate
        ]
      })
    })

    afterEach(async () => {
      await node?.stop()
    })

    it('should use the delegate router to provide', async () => {
      const deferred = pDefer()

      delegate.provide.callsFake(async () => {
        deferred.resolve()
      })

      void node.contentRouting.provide(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB'))

      return deferred.promise
    })

    it('should use the delegate router to find providers', async () => {
      const deferred = pDefer()

      delegate.findProviders.returns(async function * () {
        yield {
          id: node.peerId,
          multiaddrs: [],
          routing: 'test'
        }
        deferred.resolve()
      }())

      await drain(node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')))

      return deferred.promise
    })

    it('should be able to register as a provider', async () => {
      const cid = CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')

      await node.contentRouting.provide(cid)

      expect(delegate.provide.calledWith(cid)).to.equal(true)
    })

    it('should handle errors when registering as a provider', async () => {
      const cid = CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')

      delegate.provide.withArgs(cid).throws(new Error('Could not provide'))

      await expect(node.contentRouting.provide(cid))
        .to.eventually.be.rejected()
        .with.property('message', 'Could not provide')
    })

    it('should be able to find providers', async () => {
      const cid = CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')
      const provider = 'QmZNgCqZCvTsi3B4Vt7gsSqpkqDpE7M2Y9TDmEhbDb4ceF'

      delegate.findProviders.withArgs(cid).returns(async function * () {
        yield {
          id: peerIdFromString(provider),
          multiaddrs: [
            multiaddr('/ip4/0.0.0.0/tcp/0')
          ],
          routing: 'test'
        }
      }())

      const providers = await all(node.contentRouting.findProviders(cid))

      expect(providers).to.have.length(1)
      expect(providers[0].id.toString()).to.equal(provider)
    })

    it('should handle errors when finding providers', async () => {
      const cid = CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')

      delegate.findProviders.withArgs(cid).throws(new Error('Could not find providers'))

      await expect(drain(node.contentRouting.findProviders(cid)))
        .to.eventually.be.rejected()
        .with.property('message', 'Could not find providers')
    })
  })

  describe('via services and configured content routers', () => {
    let node: Libp2p
    let delegate: StubbedInstance<ContentRouting>
    let router: StubbedInstance<ContentRouting>

    beforeEach(async () => {
      router = stubInterface<ContentRouting>()

      delegate = stubInterface<ContentRouting>()
      delegate.provide.returns(Promise.resolve())
      delegate.findProviders.returns(async function * () {}())

      node = await createLibp2p({
        contentRouters: [
          () => delegate
        ],
        services: {
          router: () => ({
            [contentRoutingSymbol]: router
          })
        }
      })
    })

    afterEach(async () => {
      await node?.stop()
    })

    it('should store the multiaddrs of a peer', async () => {
      const providerPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const result: Provider = {
        id: providerPeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/49320')
        ],
        routing: 'test'
      }

      router.findProviders.callsFake(async function * () {})
      delegate.findProviders.callsFake(async function * () {
        yield result
      })

      expect(await node.peerStore.has(providerPeerId)).to.not.be.ok()

      await drain(node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')))

      await expect(node.peerStore.get(providerPeerId)).to.eventually.have.property('addresses').that.deep.include({
        isCertified: false,
        multiaddr: result.multiaddrs[0]
      })
    })

    it('should not wait for routing findProviders to finish before returning results', async () => {
      const providerPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const result = {
        id: providerPeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/49320')
        ],
        routing: 'test'
      }

      const defer = pDefer()

      router.findProviders.callsFake(async function * () { // eslint-disable-line require-yield
        await defer.promise
      })
      delegate.findProviders.callsFake(async function * () {
        yield result

        await defer.promise
      })

      for await (const provider of node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB'))) {
        expect(provider.id).to.deep.equal(providerPeerId)
        defer.resolve()
      }
    })

    it('should dedupe results', async () => {
      const providerPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const result = {
        id: providerPeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/49320')
        ],
        routing: 'test'
      }

      router.findProviders.callsFake(async function * () {
        yield result
      })
      delegate.findProviders.callsFake(async function * () {
        yield result
      })

      const results = await all(node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')))

      expect(results).to.be.an('array').with.lengthOf(1).that.deep.equals([result])
    })

    it('should combine multiaddrs when different addresses are returned by different content routers', async () => {
      const providerPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const result1 = {
        id: providerPeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/49320')
        ],
        routing: 'test'
      }
      const result2 = {
        id: providerPeerId,
        multiaddrs: [
          multiaddr('/ip4/213.213.213.213/tcp/2344')
        ],
        routing: 'test'
      }

      router.findProviders.callsFake(async function * () {
        yield result1
      })
      delegate.findProviders.callsFake(async function * () {
        yield result2
      })

      await drain(node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')))

      await expect(node.peerStore.get(providerPeerId)).to.eventually.have.property('addresses').that.deep.include({
        isCertified: false,
        multiaddr: result1.multiaddrs[0]
      }).and.to.deep.include({
        isCertified: false,
        multiaddr: result2.multiaddrs[0]
      })
    })

    it('should use both the service and delegate router to provide', async () => {
      const serviceDeferred = pDefer()
      const delegatedDeferred = pDefer()

      router.provide.callsFake(async function () {
        serviceDeferred.resolve()
      })

      delegate.provide.callsFake(async function () {
        delegatedDeferred.resolve()
      })

      await node.contentRouting.provide(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB'))

      await Promise.all([
        serviceDeferred.promise,
        delegatedDeferred.promise
      ])
    })

    it('should use the service if the delegate fails to find providers', async () => {
      const providerPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const results = [{
        id: providerPeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/2341')
        ],
        routing: 'test'
      }]

      router.findProviders.callsFake(async function * () {
        yield results[0]
      })

      delegate.findProviders.callsFake(async function * () {
      })

      const providers = []
      for await (const prov of node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB'))) {
        providers.push(prov)
      }

      expect(providers).to.have.length.above(0)
      expect(providers).to.eql(results)
    })

    it('should use the delegate if the service fails to find providers', async () => {
      const providerPeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const results = [{
        id: providerPeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/2341')
        ],
        routing: 'test'
      }]

      router.findProviders.callsFake(async function * () {})

      delegate.findProviders.callsFake(async function * () {
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

  describe('partial implementation', () => {
    let node: Libp2p
    let router: StubbedInstance<Partial<ContentRouting>>

    beforeEach(async () => {
      router = {
        provide: sinon.stub()
      }

      node = await createLibp2p({
        services: {
          router: () => ({
            [contentRoutingSymbol]: router
          })
        }
      })
    })

    afterEach(async () => {
      await node?.stop()
    })

    it('should invoke a method defined on the service', async () => {
      const deferred = pDefer()

      router.provide?.callsFake(async function () {
        deferred.resolve()
      })

      void node.contentRouting.provide(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB'))

      await deferred.promise
    })

    it('should not invoke a method not defined on the service', async () => {
      const result = await all(node.contentRouting.findProviders(CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')))

      expect(result).to.be.empty()
    })
  })
})
