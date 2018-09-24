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
const ma = require('multiaddr')
const Node = require('./utils/bundle-nodejs')

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
            port: 60197
          }, [
            ma('/ip4/0.0.0.0/tcp/60194')
          ])
          nodeA = new Node({
            peerInfo,
            modules: {
              contentRouting: [ delegate ]
            },
            config: {
              relay: {
                enabled: true,
                hop: {
                  enabled: true,
                  active: false
                }
              }
            }
          })
          nodeA.start(cb)
        }
      ], done)
    })

    after((done) => nodeA.stop(done))
    afterEach(() => nock.cleanAll())

    describe('provide', () => {
      it('should use the delegate router to provide', (done) => {
        const stub = sinon.stub(delegate, 'provide').callsFake(() => {
          stub.restore()
          done()
        })
        nodeA.contentRouting.provide()
      })

      it('should be able to register as a provider', (done) => {
        const cid = new CID('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')
        const mockApi = nock('http://0.0.0.0:60197')
          // mock the swarm connect
          .post('/api/v0/swarm/connect')
          .query({
            arg: `/ip4/0.0.0.0/tcp/60194/p2p-circuit/ipfs/${nodeA.peerInfo.id.toB58String()}`,
            'stream-channels': true
          })
          .reply(200, {
            Strings: [`connect ${nodeA.peerInfo.id.toB58String()} success`]
          }, ['Content-Type', 'application/json'])
          // mock the refs call
          .post('/api/v0/refs')
          .query({
            recursive: true,
            arg: cid.toBaseEncodedString(),
            'stream-channels': true
          })
          .reply(200, null, [
            'Content-Type', 'application/json',
            'X-Chunked-Output', '1'
          ])

        nodeA.contentRouting.provide(cid, (err) => {
          expect(err).to.not.exist()
          expect(mockApi.isDone()).to.equal(true)
          done()
        })
      })

      it('should handle errors when registering as a provider', (done) => {
        const cid = new CID('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')
        const mockApi = nock('http://0.0.0.0:60197')
          // mock the swarm connect
          .post('/api/v0/swarm/connect')
          .query({
            arg: `/ip4/0.0.0.0/tcp/60194/p2p-circuit/ipfs/${nodeA.peerInfo.id.toB58String()}`,
            'stream-channels': true
          })
          .reply(502, 'Bad Gateway', ['Content-Type', 'application/json'])

        nodeA.contentRouting.provide(cid, (err) => {
          expect(err).to.exist()
          expect(mockApi.isDone()).to.equal(true)
          done()
        })
      })
    })

    describe('find providers', () => {
      it('should use the delegate router to find providers', (done) => {
        const stub = sinon.stub(delegate, 'findProviders').callsFake(() => {
          stub.restore()
          done()
        })
        nodeA.contentRouting.findProviders()
      })

      it('should be able to find providers', (done) => {
        const cid = new CID('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')
        const provider = 'QmZNgCqZCvTsi3B4Vt7gsSqpkqDpE7M2Y9TDmEhbDb4ceF'
        const mockApi = nock('http://0.0.0.0:60197')
          .post('/api/v0/dht/findprovs')
          .query({
            arg: cid.toBaseEncodedString(),
            timeout: '1000ms',
            'stream-channels': true
          })
          .reply(200, `{"Extra":"","ID":"QmWKqWXCtRXEeCQTo3FoZ7g4AfnGiauYYiczvNxFCHicbB","Responses":[{"Addrs":["/ip4/0.0.0.0/tcp/0"],"ID":"${provider}"}],"Type":1}\n`, [
            'Content-Type', 'application/json',
            'X-Chunked-Output', '1'
          ])

        nodeA.contentRouting.findProviders(cid, 1000, (err, response) => {
          expect(err).to.not.exist()
          expect(response).to.have.length(1)
          expect(response[0].id.toB58String()).to.equal(provider)
          expect(mockApi.isDone()).to.equal(true)
          done()
        })
      })

      it('should handle errors when finding providers', (done) => {
        const cid = new CID('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')
        const mockApi = nock('http://0.0.0.0:60197')
          .post('/api/v0/dht/findprovs')
          .query({
            arg: cid.toBaseEncodedString(),
            timeout: '30000ms',
            'stream-channels': true
          })
          .reply(502, 'Bad Gateway', [
            'X-Chunked-Output', '1'
          ])

        nodeA.contentRouting.findProviders(cid, (err) => {
          expect(err).to.exist()
          expect(mockApi.isDone()).to.equal(true)
          done()
        })
      })
    })
  })

  describe('via the dht and a delegate', () => {
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
            port: 60197
          }, [
            ma('/ip4/0.0.0.0/tcp/60194')
          ])
          nodeA = new Node({
            peerInfo,
            modules: {
              contentRouting: [ delegate ]
            },
            config: {
              relay: {
                enabled: true,
                hop: {
                  enabled: true,
                  active: false
                }
              },
              EXPERIMENTAL: {
                dht: true
              }
            }
          })
          nodeA.start(cb)
        }
      ], done)
    })

    after((done) => nodeA.stop(done))

    describe('provide', () => {
      it('should use both the dht and delegate router to provide', (done) => {
        const dhtStub = sinon.stub(nodeA._dht, 'provide').callsFake(() => {})
        const delegateStub = sinon.stub(delegate, 'provide').callsFake(() => {
          expect(dhtStub.calledOnce).to.equal(true)
          expect(delegateStub.calledOnce).to.equal(true)
          delegateStub.restore()
          dhtStub.restore()
          done()
        })
        nodeA.contentRouting.provide()
      })
    })

    describe('findProviders', () => {
      it('should only use the dht if it finds providers', (done) => {
        const results = [true]
        const dhtStub = sinon.stub(nodeA._dht, 'findProviders').callsArgWith(2, null, results)
        const delegateStub = sinon.stub(delegate, 'findProviders').throws(() => {
          return new Error('the delegate should not have been called')
        })

        nodeA.contentRouting.findProviders('a cid', 5000, (err, results) => {
          expect(err).to.not.exist()
          expect(results).to.equal(results)
          expect(dhtStub.calledOnce).to.equal(true)
          expect(delegateStub.notCalled).to.equal(true)
          delegateStub.restore()
          dhtStub.restore()
          done()
        })
      })

      it('should use the delegate if the dht fails to find providers', (done) => {
        const results = [true]
        const dhtStub = sinon.stub(nodeA._dht, 'findProviders').callsArgWith(2, null, [])
        const delegateStub = sinon.stub(delegate, 'findProviders').callsArgWith(2, null, results)

        nodeA.contentRouting.findProviders('a cid', 5000, (err, results) => {
          expect(err).to.not.exist()
          expect(results).to.deep.equal(results)
          expect(dhtStub.calledOnce).to.equal(true)
          expect(delegateStub.calledOnce).to.equal(true)
          delegateStub.restore()
          dhtStub.restore()
          done()
        })
      })
    })
  })
})
