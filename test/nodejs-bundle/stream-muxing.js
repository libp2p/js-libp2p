/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')
const series = require('async/series')
const pull = require('pull-stream')
const utils = require('./utils')
const createNode = utils.createNode
const echo = utils.echo

function test (nodeA, nodeB, callback) {
  nodeA.dial(nodeB.peerInfo, '/echo/1.0.0', (err, conn) => {
    expect(err).to.not.exist()

    pull(
      pull.values([Buffer.from('hey')]),
      conn,
      pull.collect((err, data) => {
        expect(err).to.not.exist()
        expect(data).to.be.eql([Buffer.from('hey')])
        callback()
      })
    )
  })
}

function teardown (nodeA, nodeB, callback) {
  parallel([
    (cb) => nodeA.stop(cb),
    (cb) => nodeB.stop(cb)
  ], callback)
}

describe('stream muxing', () => {
  it('spdy only', (done) => {
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

  it('multiplex only', (done) => {
    let nodeA
    let nodeB

    function setup (callback) {
      parallel([
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['multiplex']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeA = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        }),
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['multiplex']
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

  it('spdy + multiplex', (done) => {
    let nodeA
    let nodeB

    function setup (callback) {
      parallel([
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['spdy', 'multiplex']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeA = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        }),
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['spdy', 'multiplex']
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

  it('spdy + multiplex switched order', (done) => {
    let nodeA
    let nodeB

    function setup (callback) {
      parallel([
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['spdy', 'multiplex']
        }, (err, node) => {
          expect(err).to.not.exist()
          nodeA = node
          node.handle('/echo/1.0.0', echo)
          node.start(cb)
        }),
        (cb) => createNode('/ip4/0.0.0.0/tcp/0', {
          muxer: ['multiplex', 'spdy']
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

  it('one without the other fails to establish a muxedConn', (done) => {
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
          muxer: ['multiplex']
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
        expect(Object.keys(nodeA.swarm.muxers)).to.have.length(1)
        expect(Object.keys(nodeB.swarm.muxers)).to.have.length(1)

        nodeA.dial(nodeB.peerInfo, (err) => {
          expect(err).to.not.exist()
          expect(Object.keys(nodeA.swarm.muxedConns)).to.have.length(0)
          cb()
        })
      },
      (cb) => teardown(nodeA, nodeB, cb)
    ], done)
  })
})
