/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')
const _times = require('lodash.times')

const createNode = require('./utils/create-node')

describe('.peerRouting', () => {
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

  describe('el ring', () => {
    it('let kbucket get filled', (done) => {
      setTimeout(() => done(), 250)
    })

    it('nodeA.dial by Id to node C', (done) => {
      nodeA.dial(nodeC.peerInfo.id, (err) => {
        expect(err).to.not.exist()
        done()
      })
    })

    it('nodeB.dial by Id to node D', (done) => {
      nodeB.dial(nodeD.peerInfo.id, (err) => {
        expect(err).to.not.exist()
        done()
      })
    })

    it('nodeC.dial by Id to node E', (done) => {
      nodeC.dial(nodeE.peerInfo.id, (err) => {
        expect(err).to.not.exist()
        done()
      })
    })

    it('nodeB.peerRouting.findPeer(nodeE.peerInfo.id)', (done) => {
      nodeB.peerRouting.findPeer(nodeE.peerInfo.id, (err, peerInfo) => {
        expect(err).to.not.exist()
        expect(nodeE.peerInfo.id.toB58String()).to.equal(peerInfo.id.toB58String())
        done()
      })
    })
  })
})
