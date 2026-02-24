import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerRoutingSymbol, NotFoundError } from '@libp2p/interface'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import drain from 'it-drain'
import pDefer from 'p-defer'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { createLibp2p } from '../../src/index.js'
import type { Libp2p, PeerId, PeerInfo, PeerRouting } from '@libp2p/interface'
import type { StubbedInstance } from 'sinon-ts'

describe('peer-routing', () => {
  let peerId: PeerId

  beforeEach(async () => {
    peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
  })

  describe('no routers', () => {
    let node: Libp2p

    beforeEach(async () => {
      node = await createLibp2p()
    })

    afterEach(async () => {
      await node?.stop()
    })

    it('.findPeer should return an error', async () => {
      await expect(node.peerRouting.findPeer(peerId))
        .to.eventually.be.rejected()
        .and.to.have.property('name', 'NoPeerRoutersError')
    })

    it('.getClosestPeers should return an error', async () => {
      try {
        for await (const _ of node.peerRouting.getClosestPeers(peerId.toMultihash().bytes)) { } // eslint-disable-line
        throw new Error('.getClosestPeers should return an error')
      } catch (err: any) {
        expect(err).to.exist()
        expect(err.name).to.equal('NoPeerRoutersError')
      }
    })
  })

  describe('via configured service', () => {
    let node: Libp2p
    let router: StubbedInstance<PeerRouting>

    beforeEach(async () => {
      router = stubInterface<PeerRouting>()

      node = await createLibp2p({
        services: {
          router: () => ({
            [peerRoutingSymbol]: router
          })
        }
      })
    })

    afterEach(async () => {
      await node?.stop()
    })

    it('should use the configured service', async () => {
      const peerInfo = {
        id: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/4001')
        ]
      }

      router.findPeer.callsFake(async function () {
        return peerInfo
      })

      await expect(node.peerRouting.findPeer(peerInfo.id)).to.eventually.deep.equal(peerInfo)
    })

    it('should use the service to get the closest peers', async () => {
      const deferred = pDefer()
      router.getClosestPeers.callsFake(async function * () {
        yield {
          id: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
          multiaddrs: [
            multiaddr('/ip4/123.123.123.123/tcp/49320')
          ]
        }

        deferred.resolve()
      })

      await drain(node.peerRouting.getClosestPeers(Uint8Array.from([0, 1, 2, 3, 4])))

      await deferred.promise
    })

    it('should error when peer tries to find itself', async () => {
      await expect(node.peerRouting.findPeer(node.peerId))
        .to.eventually.be.rejected()
        .and.to.have.property('name', 'QueriedForSelfError')
    })

    it('should handle error thrown synchronously during find peer', async () => {
      const unknownPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

      router.findPeer.callsFake(function () {
        throw new Error('Thrown sync')
      })

      await expect(node.peerRouting.findPeer(unknownPeer))
        .to.eventually.be.rejected()
        .and.to.have.property('name', 'NotFoundError')
    })

    it('should handle error thrown asynchronously during find peer', async () => {
      const unknownPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

      router.findPeer.callsFake(async function () {
        throw new Error('Thrown async')
      })

      await expect(node.peerRouting.findPeer(unknownPeer))
        .to.eventually.be.rejected()
        .and.to.have.property('name', 'NotFoundError')
    })

    it('should handle error thrown asynchronously after delay during find peer', async () => {
      const unknownPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

      router.findPeer.callsFake(async function () {
        await delay(100)
        throw new Error('Thrown async')
      })

      await expect(node.peerRouting.findPeer(unknownPeer))
        .to.eventually.be.rejected()
        .and.to.have.property('name', 'NotFoundError')
    })
  })

  describe('via configured peer router', () => {
    let node: Libp2p
    let delegate: StubbedInstance<PeerRouting>

    beforeEach(async () => {
      delegate = stubInterface<PeerRouting>()

      node = await createLibp2p({
        peerRouters: [
          () => delegate
        ]
      })
    })

    afterEach(async () => {
      await node?.stop()
    })

    it('should use the delegate router to find peers', async () => {
      const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

      delegate.findPeer.callsFake(async function () {
        return {
          id: remotePeerId,
          multiaddrs: [
            multiaddr('/ip4/123.123.123.123/tcp/49320')
          ]
        }
      })

      expect(delegate.findPeer.called).to.be.false()
      await node.peerRouting.findPeer(remotePeerId)
      expect(delegate.findPeer.called).to.be.true()
    })

    it('should use the delegate router to get the closest peers', async () => {
      const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

      delegate.getClosestPeers.callsFake(async function * () {
        yield {
          id: remotePeerId,
          multiaddrs: [
            multiaddr('/ip4/123.123.123.123/tcp/49320')
          ]
        }
      })

      expect(delegate.getClosestPeers.called).to.be.false()
      await drain(node.peerRouting.getClosestPeers(remotePeerId.toMultihash().bytes))
      expect(delegate.getClosestPeers.called).to.be.true()
    })

    it('should error when peer tries to find itself', async () => {
      await expect(node.peerRouting.findPeer(node.peerId))
        .to.eventually.be.rejected()
        .and.to.have.property('name', 'QueriedForSelfError')
    })

    it('should handle errors from the delegate when finding closest peers', async () => {
      const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

      delegate.getClosestPeers.callsFake(async function * () { // eslint-disable-line require-yield
        throw new Error('Could not find closer peers')
      })

      expect(delegate.getClosestPeers.called).to.be.false()
      await expect(drain(node.peerRouting.getClosestPeers(remotePeerId.toMultihash().bytes)))
        .to.eventually.be.rejectedWith('Could not find closer peers')
    })
  })

  describe('via service and delegate routers', () => {
    let node: Libp2p
    let delegate: StubbedInstance<PeerRouting>
    let router: StubbedInstance<PeerRouting>

    beforeEach(async () => {
      router = stubInterface<PeerRouting>()
      delegate = stubInterface<PeerRouting>()

      node = await createLibp2p({
        peerRouters: [
          () => delegate
        ],
        services: {
          router: () => ({
            [peerRoutingSymbol]: router
          })
        }
      })
    })

    afterEach(async () => {
      await node?.stop()
    })

    it('should use the delegate if the service fails to find the peer', async () => {
      const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const results = {
        id: remotePeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/49320')
        ]
      }

      router.findPeer.callsFake(async function () {
        await delay(100)
        throw new NotFoundError('Not found')
      })
      delegate.findPeer.callsFake(async () => {
        return results
      })

      const peer = await node.peerRouting.findPeer(remotePeerId)
      expect(peer).to.eql(results)
    })

    it('should not wait for the service to return if the delegate does first', async () => {
      const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const results = {
        id: remotePeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/49320')
        ]
      }

      const defer = pDefer()

      router.findPeer.callsFake(async function () {
        await defer.promise
        throw new NotFoundError('Not found')
      })
      delegate.findPeer.callsFake(async () => {
        return results
      })

      const peer = await node.peerRouting.findPeer(remotePeerId)
      expect(peer).to.eql(results)

      defer.resolve()
    })

    it('should not wait for the delegate to return if the service does first', async () => {
      const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const result = {
        id: remotePeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/49320')
        ]
      }

      const defer = pDefer<PeerInfo>()

      router.findPeer.callsFake(async function () {
        return result
      })
      delegate.findPeer.callsFake(async () => {
        await defer.promise
        throw new NotFoundError('Not found')
      })

      const peer = await node.peerRouting.findPeer(remotePeerId)
      expect(peer).to.eql(result)

      defer.resolve(result)
    })

    it('should return value when one router errors synchronously and another returns a value', async () => {
      const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

      router.findPeer.callsFake(function () {
        throw new Error('Thrown sync')
      })

      delegate.findPeer.callsFake(async function () {
        return {
          id: peer,
          multiaddrs: [
            multiaddr('/ip4/123.123.123.123/tcp/49320')
          ]
        }
      })

      await expect(node.peerRouting.findPeer(peer))
        .to.eventually.deep.equal({
          id: peer,
          multiaddrs: [
            multiaddr('/ip4/123.123.123.123/tcp/49320')
          ]
        })
    })

    it('should return value when one router errors asynchronously and another returns a value', async () => {
      const peer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

      router.findPeer.callsFake(async function () {
        throw new Error('Thrown async')
      })

      delegate.findPeer.callsFake(async function () {
        return {
          id: peer,
          multiaddrs: [
            multiaddr('/ip4/123.123.123.123/tcp/49320')
          ]
        }
      })

      await expect(node.peerRouting.findPeer(peer))
        .to.eventually.deep.equal({
          id: peer,
          multiaddrs: [
            multiaddr('/ip4/123.123.123.123/tcp/49320')
          ]
        })
    })

    it('should store the addresses of the found peer', async () => {
      const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const result = {
        id: remotePeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/38982')
        ]
      }

      const spy = sinon.spy(node.peerStore, 'merge')

      router.findPeer.callsFake(async function () {
        return result
      })
      delegate.findPeer.callsFake(async () => {
        const deferred = pDefer<PeerInfo>()

        return deferred.promise
      })

      await node.peerRouting.findPeer(remotePeerId)

      expect(spy.calledWith(result.id, {
        multiaddrs: result.multiaddrs
      })).to.be.true()
    })

    it('should use the delegate if the service fails to get the closest peer', async () => {
      const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const results = [{
        id: remotePeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/49320')
        ]
      }]

      router.getClosestPeers.callsFake(async function * () { })

      delegate.getClosestPeers.callsFake(async function * () {
        yield results[0]
      })

      const closest = await all(node.peerRouting.getClosestPeers(remotePeerId.toMultihash().bytes))

      expect(closest).to.have.length.above(0)
      expect(closest).to.eql(results)
    })

    it('should store the addresses of the closest peer', async () => {
      const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const result = {
        id: remotePeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/38982')
        ]
      }

      const spy = sinon.spy(node.peerStore, 'merge')

      router.getClosestPeers.callsFake(async function * () { })

      delegate.getClosestPeers.callsFake(async function * () {
        yield result
      })

      await drain(node.peerRouting.getClosestPeers(remotePeerId.toMultihash().bytes))

      expect(spy.calledWith(result.id, {
        multiaddrs: result.multiaddrs
      })).to.be.true()
    })

    it('should dedupe closest peers', async () => {
      const remotePeerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const results = [{
        id: remotePeerId,
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/38982')
        ]
      }]

      router.getClosestPeers.callsFake(async function * () {
        for (const peer of results) {
          yield peer
        }
      })

      delegate.getClosestPeers.callsFake(async function * () {
        yield * results
      })

      const peers = await all(node.peerRouting.getClosestPeers(remotePeerId.toMultihash().bytes))

      expect(peers).to.be.an('array').with.a.lengthOf(1).that.deep.equals(results)
    })
  })

  describe('partial implementation', () => {
    let node: Libp2p
    let router: StubbedInstance<Partial<PeerRouting>>

    beforeEach(async () => {
      router = {
        findPeer: sinon.stub()
      }

      node = await createLibp2p({
        services: {
          router: () => ({
            [peerRoutingSymbol]: router
          })
        }
      })
    })

    afterEach(async () => {
      await node?.stop()
    })

    it('should invoke a method defined on the service', async () => {
      const peerInfo = {
        id: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
        multiaddrs: [
          multiaddr('/ip4/123.123.123.123/tcp/4001')
        ]
      }

      router.findPeer?.callsFake(async function () {
        return peerInfo
      })

      await expect(node.peerRouting.findPeer(peerInfo.id)).to.eventually.deep.equal(peerInfo)
    })

    it('should not invoke a method not defined on the service', async () => {
      const result = await all(node.peerRouting.getClosestPeers(Uint8Array.from([0, 1, 2, 3, 4])))

      expect(result).to.be.empty()
    })
  })
})
