/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')
const _times = require('lodash.times')
const DelegatedPeerRouter = require('libp2p-delegated-peer-routing')
const sinon = require('sinon')
const nock = require('nock')

const createNode = require('./utils/create-node')

describe('.peerRouting', () => {
  describe('via the dht', () => {
    let nodeA
    let nodeB
    let nodeC
    let nodeD
    let nodeE

    before('create the outer ring of connections', (done) => {
      const tasks = _times(5, () => (cb) => {
        createNode('/ip4/0.0.0.0/tcp/0', {
          config: {
            EXPERIMENTAL: {
              dht: true
            }
          }
        }, (err, node) => {
          expect(err).to.not.exist()
          node.start((err) => cb(err, node))
        })
      })

      parallel(tasks, (err, nodes) => {
        expect(err).to.not.exist()
        nodeA = nodes[0]
        nodeB = nodes[1]
        nodeC = nodes[2]
        nodeD = nodes[3]
        nodeE = nodes[4]

        parallel([
          (cb) => nodeA.dial(nodeB.peerInfo, cb),
          (cb) => nodeB.dial(nodeC.peerInfo, cb),
          (cb) => nodeC.dial(nodeD.peerInfo, cb),
          (cb) => nodeD.dial(nodeE.peerInfo, cb),
          (cb) => nodeE.dial(nodeA.peerInfo, cb)
        ], (err) => {
          expect(err).to.not.exist()
          // Give the kbucket time to fill in the dht
          setTimeout(done, 250)
        })
      })
    })

    after((done) => {
      parallel([
        (cb) => nodeA.stop(cb),
        (cb) => nodeB.stop(cb),
        (cb) => nodeC.stop(cb),
        (cb) => nodeD.stop(cb),
        (cb) => nodeE.stop(cb)
      ], done)
    })

    it('should use the nodes dht', (done) => {
      const stub = sinon.stub(nodeA._dht, 'findPeer').callsFake(() => {
        stub.restore()
        done()
      })

      nodeA.peerRouting.findPeer()
    })

    describe('connected in an el ring', () => {
      it('should be able to find a peer we are not directly connected to', (done) => {
        parallel([
          (cb) => nodeA.dial(nodeC.peerInfo.id, cb),
          (cb) => nodeB.dial(nodeD.peerInfo.id, cb),
          (cb) => nodeC.dial(nodeE.peerInfo.id, cb)
        ], (err) => {
          if (err) throw err
          expect(err).to.not.exist()
          nodeB.peerRouting.findPeer(nodeE.peerInfo.id, (err, peerInfo) => {
            expect(err).to.not.exist()
            expect(nodeE.peerInfo.id.toB58String()).to.equal(peerInfo.id.toB58String())
            done()
          })
        })
      })
    })
  })

  describe('via a delegate', () => {
    let nodeA
    let delegate

    before((done) => {
      parallel([
        // Create the node using the delegate
        (cb) => {
          delegate = new DelegatedPeerRouter({
            host: 'ipfs.io',
            protocol: 'https',
            port: '443'
          })
          createNode('/ip4/0.0.0.0/tcp/0', {
            modules: {
              peerRouting: delegate
            }
          }, (err, node) => {
            expect(err).to.not.exist()
            nodeA = node
            nodeA.start(cb)
          })
        }
      ], done)
    })

    afterEach(nock.cleanAll)

    it('should use the delegate router to find peers', (done) => {
      const stub = sinon.stub(delegate, 'findPeer').callsFake(() => {
        stub.restore()
        done()
      })
      nodeA.peerRouting.findPeer()
    })

    it('should be able to find a peer', (done) => {
      const peerKey = 'key of a peer on the network'
      const mockApi = nock('https://ipfs.io')
        .post('/api/v0/dht/findpeer')
        .query({
          arg: peerKey,
          'stream-channels': true
        })
        .reply(200, `{"Extra":"","ID":"some other id","Responses":null,"Type":0}\n{"Extra":"","ID":"","Responses":[{"Addrs":["/ip4/127.0.0.1/tcp/4001"],"ID":"${peerKey}"}],"Type":2}\n`, [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])

      nodeA.peerRouting.findPeer(peerKey, (err, peerInfo) => {
        expect(err).to.not.exist()
        expect(peerInfo.id).to.equal(peerKey)
        expect(mockApi.isDone()).to.equal(true)
        done()
      })
    })

    it('should error when a peer cannot be found', (done) => {
      const peerKey = 'key of a peer not on the network'
      const mockApi = nock('https://ipfs.io')
        .post('/api/v0/dht/findpeer')
        .query({
          arg: peerKey,
          'stream-channels': true
        })
        .reply(200, `{"Extra":"","ID":"some other id","Responses":null,"Type":6}\n{"Extra":"","ID":"yet another id","Responses":null,"Type":0}\n{"Extra":"routing:not found","ID":"","Responses":null,"Type":3}\n`, [
          'Content-Type', 'application/json',
          'X-Chunked-Output', '1'
        ])

      nodeA.peerRouting.findPeer(peerKey, (err, peerInfo) => {
        expect(err).to.exist()
        expect(peerInfo).to.not.exist()
        expect(mockApi.isDone()).to.equal(true)
        done()
      })
    })

    it('should handle errors from the api', (done) => {
      const peerKey = 'key of a peer not on the network'
      const mockApi = nock('https://ipfs.io')
        .post('/api/v0/dht/findpeer')
        .query({
          arg: peerKey,
          'stream-channels': true
        })
        .reply(502)

      nodeA.peerRouting.findPeer(peerKey, (err, peerInfo) => {
        expect(err).to.exist()
        expect(peerInfo).to.not.exist()
        expect(mockApi.isDone()).to.equal(true)
        done()
      })
    })
  })
})
