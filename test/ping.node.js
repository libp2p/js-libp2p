/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')

const createNode = require('./utils/create-node.js')
const echo = require('./utils/echo')

describe('ping', () => {
  let nodeA
  let nodeB

  before((done) => {
    parallel([
      (cb) => createNode('/ip4/0.0.0.0/tcp/0', (err, node) => {
        expect(err).to.not.exist()
        nodeA = node
        node.handle('/echo/1.0.0', echo)
        node.start(cb)
      }),
      (cb) => createNode('/ip4/0.0.0.0/tcp/0', (err, node) => {
        expect(err).to.not.exist()
        nodeB = node
        node.handle('/echo/1.0.0', echo)
        node.start(cb)
      })
    ], done)
  })

  after((done) => {
    parallel([
      (cb) => nodeA.stop(cb),
      (cb) => nodeB.stop(cb)
    ], done)
  })

  it('should be able to ping another node', (done) => {
    nodeA.ping(nodeB.peerInfo, (err, ping) => {
      expect(err).to.not.exist()
      ping.once('ping', (time) => {
        expect(time).to.exist()
        ping.stop()
        done()
      })

      ping.start()
    })
  })

  it('should be not be able to ping when stopped', (done) => {
    nodeA.stop(() => {
      nodeA.ping(nodeB.peerInfo, (err) => {
        expect(err).to.exist()
        done()
      })
    })
  })
})
