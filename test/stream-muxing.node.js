/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')
const series = require('async/series')

const createNode = require('./utils/create-node')
const tryEcho = require('./utils/try-echo')
const echo = require('./utils/echo')

function test (nodeA, nodeB, callback) {
  nodeA.dialProtocol(nodeB.peerInfo, '/echo/1.0.0', (err, conn) => {
    expect(err).to.not.exist()
    tryEcho(conn, callback)
  })
}

function teardown (nodeA, nodeB, callback) {
  parallel([
    (cb) => nodeA.stop(cb),
    (cb) => nodeB.stop(cb)
  ], callback)
}

describe('stream muxing', () => {
  it('spdy only', function (done) {
    this.timeout(5 * 1000)

    let nodeA
    let nodeB

    function setup (callback) {
      parallel([
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['spdy']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeA = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        }),
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['spdy']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeB = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        })
      ], callback)
    }

    series([
      (cb) => setup(cb),
      (cb) => test(nodeA, nodeB, cb),
      (cb) => teardown(nodeA, nodeB, cb)
    ], done)
  })

  it('mplex only', (done) => {
    let nodeA
    let nodeB

    function setup (callback) {
      parallel([
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['mplex']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeA = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        }),
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['mplex']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeB = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        })
      ], callback)
    }

    series([
      (cb) => setup(cb),
      (cb) => test(nodeA, nodeB, cb),
      (cb) => teardown(nodeA, nodeB, cb)
    ], done)
  })

  it('spdy + mplex', function (done) {
    this.timeout(5000)

    let nodeA
    let nodeB

    function setup (callback) {
      parallel([
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['spdy', 'mplex']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeA = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        }),
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['spdy', 'mplex']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeB = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        })
      ], callback)
    }

    series([
      (cb) => setup(cb),
      (cb) => test(nodeA, nodeB, cb),
      (cb) => teardown(nodeA, nodeB, cb)
    ], done)
  })

  it('spdy + mplex switched order', function (done) {
    this.timeout(5 * 1000)

    let nodeA
    let nodeB

    function setup (callback) {
      parallel([
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['spdy', 'mplex']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeA = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        }),
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['mplex', 'spdy']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeB = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        })
      ], callback)
    }

    series([
      (cb) => setup(cb),
      (cb) => test(nodeA, nodeB, cb),
      (cb) => teardown(nodeA, nodeB, cb)
    ], done)
  })

  it('one without the other fails to establish a muxedConn', function (done) {
    this.timeout(5 * 1000)

    let nodeA
    let nodeB

    function setup (callback) {
      parallel([
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['spdy']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeA = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        }),
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['mplex']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeB = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        })
      ], callback)
    }

    series([
      (cb) => setup(cb),
      (cb) => {
        // it will just 'warm up a conn'
        expect(Object.keys(nodeA._switch.muxers)).to.have.length(1)
        expect(Object.keys(nodeB._switch.muxers)).to.have.length(1)

        nodeA.dial(nodeB.peerInfo, (err) => {
          expect(err).to.not.exist()
          expect(Object.keys(nodeA._switch.muxedConns)).to.have.length(0)
          cb()
        })
      },
      (cb) => teardown(nodeA, nodeB, cb)
    ], done)
  })
})
