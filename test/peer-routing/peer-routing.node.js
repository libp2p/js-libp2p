'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const nock = require('nock')
const sinon = require('sinon')

const pDefer = require('p-defer')
const mergeOptions = require('merge-options')

const ipfsHttpClient = require('ipfs-http-client')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')

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

    it('.findPeer should return an error', async () => {
      await expect(node.peerRouting.findPeer('a cid'))
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

    after(() => {
      sinon.restore()
    })

    after(() => Promise.all(nodes.map((n) => n.stop())))

    it('should use the nodes dht', () => {
      const deferred = pDefer()

      sinon.stub(nodes[0]._dht, 'findPeer').callsFake(() => {
        deferred.resolve()
        return nodes[1].peerId
      })

      nodes[0].peerRouting.findPeer()
      return deferred.promise
    })
  })

  describe('via delegate router', () => {
    let node
    let delegate

    beforeEach(async () => {
      delegate = new DelegatedPeerRouter(ipfsHttpClient({
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

    it('should use the delegate router to find peers', async () => {
      const deferred = pDefer()

      sinon.stub(delegate, 'findPeer').callsFake(() => {
        deferred.resolve()
        return 'fake peer-id'
      })

      await node.peerRouting.findPeer()
      return deferred.promise
    })

    it('should be able to find a peer', async () => {
      const peerKey = 'QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL'
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

    it('should error when a peer cannot be found', async () => {
      const peerKey = 'key of a peer not on the network'
      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/findpeer')
        .query(true)
        .reply(200, '{"Extra":"","ID":"some other id","Responses":null,"Type":6}\n{"Extra":"","ID":"yet another id","Responses":null,"Type":0}\n{"Extra":"routing:not found","ID":"","Responses":null,"Type":3}\n', [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])

      await expect(node.peerRouting.findPeer(peerKey))
        .to.eventually.be.rejected()

      expect(mockApi.isDone()).to.equal(true)
    })

    it('should handle errors from the api', async () => {
      const peerKey = 'key of a peer not on the network'
      const mockApi = nock('http://0.0.0.0:60197')
        .post('/api/v0/dht/findpeer')
        .query(true)
        .reply(502)

      await expect(node.peerRouting.findPeer(peerKey))
        .to.eventually.be.rejected()

      expect(mockApi.isDone()).to.equal(true)
    })
  })

  describe('via dht and delegate routers', () => {
    let node
    let delegate

    beforeEach(async () => {
      delegate = new DelegatedPeerRouter(ipfsHttpClient({
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

    it('should only use the dht if it finds the peer', async () => {
      const dhtDeferred = pDefer()

      sinon.stub(node._dht, 'findPeer').callsFake(() => {
        dhtDeferred.resolve()
        return { id: node.peerId }
      })
      sinon.stub(delegate, 'findPeer').callsFake(() => {
        throw new Error('the delegate should not have been called')
      })

      await node.peerRouting.findPeer('a peer id')
      await dhtDeferred.promise
    })

    it('should use the delegate if the dht fails to find the peer', async () => {
      const results = [true]

      sinon.stub(node._dht, 'findPeer').callsFake(() => {})
      sinon.stub(delegate, 'findPeer').callsFake(() => {
        return results
      })

      const peer = await node.peerRouting.findPeer('a peer id')
      expect(peer).to.eql(results)
    })
  })
})
