'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const nock = require('nock')
const sinon = require('sinon')
const intoStream = require('into-stream')

const delay = require('delay')
const pDefer = require('p-defer')
const pWaitFor = require('p-wait-for')
const mergeOptions = require('merge-options')
const drain = require('it-drain')
const all = require('it-all')

const ipfsHttpClient = require('ipfs-http-client')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')

const peerUtils = require('../utils/creators/peer')
const { baseOptions, routingOptions } = require('./utils')

describe('peer-routing', () => {
  describe('no routers', () => {
    let node

    before(async () => {
      [node] = await peerUtils.createPeer({
        config: baseOptions
      })
    })

    after(() => node.stop())

    it('.findPeer should return an error', async () => {
      await expect(node.peerRouting.findPeer('a cid'))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_NO_ROUTERS_AVAILABLE')
    })

    it('.getClosestPeers should return an error', async () => {
      try {
        for await (const _ of node.peerRouting.getClosestPeers('a cid')) { } // eslint-disable-line
        throw new Error('.getClosestPeers should return an error')
      } catch (/** @type {any} */ err) {
        expect(err).to.exist()
        expect(err.code).to.equal('ERR_NO_ROUTERS_AVAILABLE')
      }
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

    after(() => {
      sinon.restore()
    })

    after(() => Promise.all(nodes.map((n) => n.stop())))

    it('should use the nodes dht', async () => {
      sinon.stub(nodes[0]._dht, 'findPeer').callsFake(async function * () {
        yield {
          name: 'FINAL_PEER',
          peer: {
            id: nodes[1].peerId,
            multiaddrs: []
          }
        }
      })

      expect(nodes[0]._dht.findPeer.called).to.be.false()
      await nodes[0].peerRouting.findPeer(nodes[1].peerId)
      expect(nodes[0]._dht.findPeer.called).to.be.true()
      nodes[0]._dht.findPeer.restore()
    })

    it('should use the nodes dht to get the closest peers', async () => {
      sinon.stub(nodes[0]._dht, 'getClosestPeers').callsFake(async function * () {
        yield {
          name: 'PEER_RESPONSE',
          closer: [{
            id: nodes[1].peerId,
            multiaddrs: []
          }]
        }
      })

      expect(nodes[0]._dht.getClosestPeers.called).to.be.false()
      await drain(nodes[0].peerRouting.getClosestPeers(nodes[1].peerId))
      expect(nodes[0]._dht.getClosestPeers.called).to.be.true()
      nodes[0]._dht.getClosestPeers.restore()
    })

    it('should error when peer tries to find itself', async () => {
      await expect(nodes[0].peerRouting.findPeer(nodes[0].peerId))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_FIND_SELF')
    })

    it('should handle error thrown synchronously during find peer', async () => {
      const unknownPeers = await peerUtils.createPeerId({ number: 1, fixture: false })

      nodes[0].peerRouting._routers = [{
        findPeer () {
          throw new Error('Thrown sync')
        }
      }]

      await expect(nodes[0].peerRouting.findPeer(unknownPeers[0]))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_NOT_FOUND')
    })

    it('should handle error thrown asynchronously during find peer', async () => {
      const unknownPeers = await peerUtils.createPeerId({ number: 1, fixture: false })

      nodes[0].peerRouting._routers = [{
        async findPeer () {
          throw new Error('Thrown async')
        }
      }]

      await expect(nodes[0].peerRouting.findPeer(unknownPeers[0]))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_NOT_FOUND')
    })

    it('should handle error thrown asynchronously after delay during find peer', async () => {
      const unknownPeers = await peerUtils.createPeerId({ number: 1, fixture: false })

      nodes[0].peerRouting._routers = [{
        async findPeer () {
          await delay(100)
          throw new Error('Thrown async after delay')
        }
      }]

      await expect(nodes[0].peerRouting.findPeer(unknownPeers[0]))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_NOT_FOUND')
    })

    it('should return value when one router errors synchronously and another returns a value', async () => {
      const [peer] = await peerUtils.createPeerId({ number: 1, fixture: false })

      nodes[0].peerRouting._routers = [{
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
      const [peer] = await peerUtils.createPeerId({ number: 1, fixture: false })

      nodes[0].peerRouting._routers = [{
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
    let node
    let delegate

    beforeEach(async () => {
      delegate = new DelegatedPeerRouter(ipfsHttpClient.create({
        host: '0.0.0.0',
        protocol: 'http',
        port: 60197
      }))

      ;[node] = await peerUtils.createPeer({
        config: mergeOptions(baseOptions, {
          modules: {
            peerRouting: [delegate]
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
      nock.cleanAll()
      sinon.restore()
    })

    afterEach(() => node.stop())

    it('should only have one router', () => {
      expect(node.peerRouting._routers).to.have.lengthOf(1)
    })

    it('should use the delegate router to find peers', async () => {
      const [remotePeerId] = await peerUtils.createPeerId({ fixture: false })

      sinon.stub(delegate, 'findPeer').callsFake(() => {
        return {
          id: remotePeerId,
          multiaddrs: []
        }
      })

      expect(delegate.findPeer.called).to.be.false()
      await node.peerRouting.findPeer(remotePeerId)
      expect(delegate.findPeer.called).to.be.true()
      delegate.findPeer.restore()
    })

    it('should use the delegate router to get the closest peers', async () => {
      const [remotePeerId] = await peerUtils.createPeerId({ fixture: false })

      sinon.stub(delegate, 'getClosestPeers').callsFake(function * () {
        yield {
          id: remotePeerId,
          multiaddrs: []
        }
      })

      expect(delegate.getClosestPeers.called).to.be.false()
      await drain(node.peerRouting.getClosestPeers(remotePeerId))
      expect(delegate.getClosestPeers.called).to.be.true()
      delegate.getClosestPeers.restore()
    })

    it('should be able to find a peer', async () => {
      const peerKey = PeerId.createFromB58String('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')
      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/findpeer')
        .query(true)
        .reply(200, `{"Extra":"","ID":"some other id","Responses":null,"Type":0}\n{"Extra":"","ID":"","Responses":[{"Addrs":["/ip4/127.0.0.1/tcp/4001"],"ID":"${peerKey}"}],"Type":2}\n`, [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])

      const peer = await node.peerRouting.findPeer(peerKey)

      expect(peer.id).to.equal(peerKey)
      expect(mockApi.isDone()).to.equal(true)
    })

    it('should error when peer tries to find itself', async () => {
      await expect(node.peerRouting.findPeer(node.peerId))
        .to.eventually.be.rejected()
        .and.to.have.property('code', 'ERR_FIND_SELF')
    })

    it('should error when a peer cannot be found', async () => {
      const peerId = await PeerId.create({ keyType: 'ed25519' })
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
      const peerId = await PeerId.create({ keyType: 'ed25519' })
      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/findpeer')
        .query(true)
        .reply(502)

      await expect(node.peerRouting.findPeer(peerId))
        .to.eventually.be.rejected()

      expect(mockApi.isDone()).to.equal(true)
    })

    it('should be able to get the closest peers', async () => {
      const peerId = await PeerId.create({ keyType: 'ed25519' })
      const closest1 = '12D3KooWLewYMMdGWAtuX852n4rgCWkK7EBn4CWbwwBzhsVoKxk3'
      const closest2 = '12D3KooWDtoQbpKhtnWddfj72QmpFvvLDTsBLTFkjvgQm6cde2AK'

      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/query')
        .query(true)
        .reply(200,
          () => intoStream([
            `{"extra":"","id":"${closest1}","responses":[{"ID":"${closest1}","Addrs":["/ip4/127.0.0.1/tcp/63930","/ip4/127.0.0.1/tcp/63930"]}],"type":1}\n`,
            `{"extra":"","id":"${closest2}","responses":[{"ID":"${closest2}","Addrs":["/ip4/127.0.0.1/tcp/63506","/ip4/127.0.0.1/tcp/63506"]}],"type":1}\n`,
            `{"Extra":"","ID":"${closest2}","Responses":[],"Type":2}\n`,
            `{"Extra":"","ID":"${closest1}","Responses":[],"Type":2}\n`
          ]),
          [
            'Content-Type', 'application/json',
            'X-Chunked-Output', '1'
          ])

      const closestPeers = await all(node.peerRouting.getClosestPeers(peerId.id, { timeout: 1000 }))

      expect(closestPeers).to.have.length(2)
      expect(closestPeers[0].id.toB58String()).to.equal(closest1)
      expect(closestPeers[0].multiaddrs).to.have.lengthOf(2)
      expect(closestPeers[1].id.toB58String()).to.equal(closest2)
      expect(closestPeers[1].multiaddrs).to.have.lengthOf(2)
      expect(mockApi.isDone()).to.equal(true)
    })

    it('should handle errors when getting the closest peers', async () => {
      const peerId = await PeerId.create({ keyType: 'ed25519' })

      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/query')
        .query(true)
        .reply(502, 'Bad Gateway', [
          'X-Chunked-Output', '1'
        ])

      try {
        for await (const _ of node.peerRouting.getClosestPeers(peerId.id)) { } // eslint-disable-line
        throw new Error('should handle errors when getting the closest peers')
      } catch (/** @type {any} */ err) {
        expect(err).to.exist()
      }

      expect(mockApi.isDone()).to.equal(true)
    })
  })

  describe('via dht and delegate routers', () => {
    let node
    let delegate

    beforeEach(async () => {
      delegate = new DelegatedPeerRouter(ipfsHttpClient.create({
        host: '0.0.0.0',
        protocol: 'http',
        port: 60197
      }))

      ;[node] = await peerUtils.createPeer({
        config: mergeOptions(routingOptions, {
          modules: {
            peerRouting: [delegate]
          }
        })
      })
    })

    afterEach(() => {
      sinon.restore()
    })

    afterEach(() => node.stop())

    it('should use the delegate if the dht fails to find the peer', async () => {
      const [remotePeerId] = await peerUtils.createPeerId({ fixture: false })
      const results = {
        id: remotePeerId,
        multiaddrs: []
      }

      sinon.stub(node._dht, 'findPeer').callsFake(async function * () {})
      sinon.stub(delegate, 'findPeer').callsFake(() => {
        return results
      })

      const peer = await node.peerRouting.findPeer(remotePeerId)
      expect(peer).to.eql(results)
    })

    it('should not wait for the dht to return if the delegate does first', async () => {
      const [remotePeerId] = await peerUtils.createPeerId({ fixture: false })
      const results = {
        id: remotePeerId,
        multiaddrs: []
      }

      const defer = pDefer()

      sinon.stub(node._dht, 'findPeer').callsFake(async function * () {
        yield
        await defer.promise
      })
      sinon.stub(delegate, 'findPeer').callsFake(() => {
        return results
      })

      const peer = await node.peerRouting.findPeer(remotePeerId)
      expect(peer).to.eql(results)

      defer.resolve()
    })

    it('should not wait for the delegate to return if the dht does first', async () => {
      const [remotePeerId] = await peerUtils.createPeerId({ fixture: false })
      const result = {
        id: remotePeerId,
        multiaddrs: []
      }

      const defer = pDefer()

      sinon.stub(node._dht, 'findPeer').callsFake(async function * () {
        yield {
          name: 'FINAL_PEER',
          peer: result
        }
      })
      sinon.stub(delegate, 'findPeer').callsFake(async () => {
        await defer.promise
      })

      const peer = await node.peerRouting.findPeer(remotePeerId)
      expect(peer).to.eql(result)

      defer.resolve()
    })

    it('should store the addresses of the found peer', async () => {
      const [remotePeerId] = await peerUtils.createPeerId({ fixture: false })
      const result = {
        id: remotePeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/38982')
        ]
      }

      const spy = sinon.spy(node.peerStore.addressBook, 'add')

      sinon.stub(node._dht, 'findPeer').callsFake(async function * () {
        yield {
          name: 'FINAL_PEER',
          peer: result
        }
      })
      sinon.stub(delegate, 'findPeer').callsFake(() => {})

      await node.peerRouting.findPeer(remotePeerId)

      expect(spy.calledWith(result.id, result.multiaddrs)).to.be.true()
    })

    it('should use the delegate if the dht fails to get the closest peer', async () => {
      const [remotePeerId] = await peerUtils.createPeerId({ fixture: false })
      const results = [{
        id: remotePeerId,
        multiaddrs: []
      }]

      sinon.stub(node._dht, 'getClosestPeers').callsFake(function * () { })

      sinon.stub(delegate, 'getClosestPeers').callsFake(function * () {
        yield results[0]
      })

      const closest = await all(node.peerRouting.getClosestPeers('a cid'))

      expect(closest).to.have.length.above(0)
      expect(closest).to.eql(results)
    })

    it('should store the addresses of the closest peer', async () => {
      const [remotePeerId] = await peerUtils.createPeerId({ fixture: false })
      const result = {
        id: remotePeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/38982')
        ]
      }

      const spy = sinon.spy(node.peerStore.addressBook, 'add')

      sinon.stub(node._dht, 'getClosestPeers').callsFake(function * () { })

      sinon.stub(delegate, 'getClosestPeers').callsFake(function * () {
        yield result
      })

      await drain(node.peerRouting.getClosestPeers('a cid'))

      expect(spy.calledWith(result.id, result.multiaddrs)).to.be.true()
    })

    it('should dedupe closest peers', async () => {
      const [remotePeerId] = await peerUtils.createPeerId({ fixture: false })
      const results = [{
        id: remotePeerId,
        multiaddrs: [
          new Multiaddr('/ip4/123.123.123.123/tcp/38982')
        ]
      }]

      sinon.stub(node._dht, 'getClosestPeers').callsFake(function * () {
        yield * results
      })

      sinon.stub(delegate, 'getClosestPeers').callsFake(function * () {
        yield * results
      })

      const peers = await all(node.peerRouting.getClosestPeers('a cid'))

      expect(peers).to.be.an('array').with.a.lengthOf(1).that.deep.equals(results)
    })
  })

  describe('peer routing refresh manager service', () => {
    let node
    let peerIds

    before(async () => {
      peerIds = await peerUtils.createPeerId({ number: 2 })
    })

    afterEach(() => {
      sinon.restore()

      return node && node.stop()
    })

    it('should be enabled and start by default', async () => {
      const results = [
        { id: peerIds[0], multiaddrs: [new Multiaddr('/ip4/30.0.0.1/tcp/2000')] },
        { id: peerIds[1], multiaddrs: [new Multiaddr('/ip4/32.0.0.1/tcp/2000')] }
      ]

      ;[node] = await peerUtils.createPeer({
        config: mergeOptions(routingOptions, {
          peerRouting: {
            refreshManager: {
              bootDelay: 100
            }
          }
        }),
        started: false
      })

      sinon.spy(node.peerStore.addressBook, 'add')
      sinon.stub(node._dht, 'getClosestPeers').callsFake(function * () {
        yield {
          name: 'PEER_RESPONSE',
          closer: [
            results[0]
          ]
        }
        yield {
          name: 'PEER_RESPONSE',
          closer: [
            results[1]
          ]
        }
      })

      await node.start()

      await pWaitFor(() => node._dht.getClosestPeers.callCount === 1)
      await pWaitFor(() => node.peerStore.addressBook.add.callCount === results.length)

      const call0 = node.peerStore.addressBook.add.getCall(0)
      expect(call0.args[0].equals(results[0].id))
      call0.args[1].forEach((m, index) => {
        expect(m.equals(results[0].multiaddrs[index]))
      })

      const call1 = node.peerStore.addressBook.add.getCall(1)
      expect(call1.args[0].equals(results[1].id))
      call0.args[1].forEach((m, index) => {
        expect(m.equals(results[1].multiaddrs[index]))
      })
    })

    it('should support being disabled', async () => {
      [node] = await peerUtils.createPeer({
        config: mergeOptions(routingOptions, {
          peerRouting: {
            refreshManager: {
              bootDelay: 100,
              enabled: false
            }
          }
        }),
        started: false
      })

      sinon.stub(node._dht, 'getClosestPeers').callsFake(async function * () {
        yield
        throw new Error('should not be called')
      })

      await node.start()
      await delay(100)

      expect(node._dht.getClosestPeers.callCount === 0)
    })

    it('should start and run recurrently on interval', async () => {
      [node] = await peerUtils.createPeer({
        config: mergeOptions(routingOptions, {
          peerRouting: {
            refreshManager: {
              interval: 500,
              bootDelay: 200
            }
          }
        }),
        started: false
      })

      sinon.stub(node._dht, 'getClosestPeers').callsFake(function * () {
        yield { id: peerIds[0], multiaddrs: [new Multiaddr('/ip4/30.0.0.1/tcp/2000')] }
      })

      await node.start()

      // should run more than once
      await pWaitFor(() => node._dht.getClosestPeers.callCount === 2)
    })
  })
})
