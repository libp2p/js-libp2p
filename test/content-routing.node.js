/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')
const waterfall = require('async/waterfall')
const _times = require('lodash.times')
const CID = require('cids')
const DelegatedContentRouter = require('libp2p-delegated-content-routing')
const sinon = require('sinon')
const nock = require('nock')

const createNode = require('./utils/create-node')
const createPeerInfo = createNode.createPeerInfo

describe('.contentRouting', () => {
  describe('via the dht', () => {
    let nodeA
    let nodeB
    let nodeC
    let nodeD
    let nodeE

    before(function (done) {
      this.timeout(5 * 1000)
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
        ], done)
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

    it('should use the nodes dht to provide', (done) => {
      const stub = sinon.stub(nodeA._dht, 'provide').callsFake(() => {
        stub.restore()
        done()
      })

      nodeA.contentRouting.provide()
    })

    it('should use the nodes dht to find providers', (done) => {
      const stub = sinon.stub(nodeA._dht, 'findProviders').callsFake(() => {
        stub.restore()
        done()
      })

      nodeA.contentRouting.findProviders()
    })

    describe('le ring', () => {
      const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')

      it('let kbucket get filled', (done) => {
        setTimeout(() => done(), 250)
      })

      it('nodeA.contentRouting.provide', (done) => {
        nodeA.contentRouting.provide(cid, done)
      })

      it('nodeE.contentRouting.findProviders for existing record', (done) => {
        nodeE.contentRouting.findProviders(cid, 5000, (err, providers) => {
          expect(err).to.not.exist()
          expect(providers).to.have.length.above(0)
          done()
        })
      })

      it('nodeC.contentRouting.findProviders for non existing record (timeout)', (done) => {
        const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSnnnn')

        nodeE.contentRouting.findProviders(cid, 5000, (err, providers) => {
          expect(err).to.not.exist()
          expect(providers).to.have.length(0)
          done()
        })
      })
    })
  })

  describe('via a delegate', () => {
    let nodeA
    let delegate

    before((done) => {
      waterfall([
        (cb) => {
          createPeerInfo(cb)
        },
        // Create the node using the delegate
        (peerInfo, cb) => {
          delegate = new DelegatedContentRouter(peerInfo.id, {
            host: '0.0.0.0',
            protocol: 'http',
            port: '50082'
          })
          createNode('/ip4/0.0.0.0/tcp/0', {
            modules: {
              contentRouting: delegate
            }
          }, (err, node) => {
            expect(err).to.not.exist()
            nodeA = node
            nodeA.start(cb)
          })
        }
      ], done)
    })

    afterEach(() => {
      nock.cleanAll()
      nock.restore()
    })

    it('should use the delegate router to provide', (done) => {
      const stub = sinon.stub(delegate, 'provide').callsFake(() => {
        stub.restore()
        done()
      })
      nodeA.contentRouting.provide()
    })

    it('should use the delegate router to find providers', (done) => {
      const stub = sinon.stub(delegate, 'findProviders').callsFake(() => {
        stub.restore()
        done()
      })
      nodeA.contentRouting.findProviders()
    })

    it('should be able to register as a provider', (done) => {
      const cid = new CID('QmTp9VkYvnHyrqKQuFPiuZkiX9gPcqj6x5LJ1rmWuSySnL')
      nock.recorder.rec()
      // const mockApi = nock('https://ipfs.io')
      //   .post('/api/v0/dht/findpeer')
      //   .query({
      //     arg: peerKey,
      //     'stream-channels': true
      //   })
      //   .reply(200, `{"Extra":"","ID":"some other id","Responses":null,"Type":0}\n{"Extra":"","ID":"","Responses":[{"Addrs":["/ip4/127.0.0.1/tcp/4001"],"ID":"${peerKey}"}],"Type":2}\n`, [
      //     'Content-Type', 'application/json',
      //     'X-Chunked-Output', '1'
      //   ])

      nodeA.contentRouting.provide(cid, (err, data) => {
        expect(err).to.not.exist()
        expect(data).to.equal({})
        nock.restore()
        // expect(mockApi.isDone()).to.equal(true)
        done()
      })
    })

    // it('should error when a peer cannot be found', (done) => {
    //   const peerKey = 'key of a peer not on the network'
    //   const mockApi = nock('https://ipfs.io')
    //     .post('/api/v0/dht/findpeer')
    //     .query({
    //       arg: peerKey,
    //       'stream-channels': true
    //     })
    //     .reply(200, `{"Extra":"","ID":"some other id","Responses":null,"Type":6}\n{"Extra":"","ID":"yet another id","Responses":null,"Type":0}\n{"Extra":"routing:not found","ID":"","Responses":null,"Type":3}\n`, [
    //       'Content-Type', 'application/json',
    //       'X-Chunked-Output', '1'
    //     ])

    //   nodeA.peerRouting.findPeer(peerKey, (err, peerInfo) => {
    //     expect(err).to.exist()
    //     expect(peerInfo).to.not.exist()
    //     expect(mockApi.isDone()).to.equal(true)
    //     done()
    //   })
    // })

    // it('should handle errors from the api', (done) => {
    //   const peerKey = 'key of a peer not on the network'
    //   const mockApi = nock('https://ipfs.io')
    //     .post('/api/v0/dht/findpeer')
    //     .query({
    //       arg: peerKey,
    //       'stream-channels': true
    //     })
    //     .reply(502)

    //   nodeA.peerRouting.findPeer(peerKey, (err, peerInfo) => {
    //     expect(err).to.exist()
    //     expect(peerInfo).to.not.exist()
    //     expect(mockApi.isDone()).to.equal(true)
    //     done()
    //   })
    // })
  })
})
