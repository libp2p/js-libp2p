/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */

'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')
const _times = require('lodash.times')
const utils = require('./utils/node')
const createNode = utils.createNode

describe('.pubsub', () => {
  let nodeA
  let nodeB

  before(function (done) {
    this.timeout(5 * 1000)

    const tasks = _times(2, () => (cb) => {
      createNode('/ip4/0.0.0.0/tcp/0', {
        mdns: false,
        dht: true
      }, (err, node) => {
        expect(err).to.not.exist()
        node.start((err) => cb(err, node))
      })
    })

    parallel(tasks, (err, nodes) => {
      expect(err).to.not.exist()
      nodeA = nodes[0]
      nodeB = nodes[1]

      nodeA.dial(nodeB.peerInfo, done)
    })
  })

  after((done) => {
    parallel([
      (cb) => nodeA.stop(cb),
      (cb) => nodeB.stop(cb)
    ], done)
  })

  describe('.pubsub on (default)', () => {
  })

  describe('.pubsub off', () => {
  })
})
