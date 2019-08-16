'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const series = require('async/series')
const each = require('async/each')

const createLibp2pNode = require('./create-libp2p-node')
const connectAll = require('./connect-all')
const tryConnectAll = require('./try-connect-all')

module.exports = (count, options) => {
  let nodes

  if (!Array.isArray(options)) {
    const opts = options
    options = []
    for (let n = 0; n < count; n++) {
      options[n] = opts
    }
  }

  const create = (done) => {
    const tasks = []
    for (let i = 0; i < count; i++) {
      tasks.push((cb) => createLibp2pNode(options.shift() || {}, cb))
    }

    series(tasks, (err, things) => {
      if (!err) {
        nodes = things
        expect(things.length).to.equal(count)
      }
      done(err)
    })
  }

  const connect = function (done) {
    if (this && this.timeout) {
      this.timeout(10000)
    }
    connectAll(nodes, done)
  }

  const tryConnectAllFn = function (done) {
    if (this && this.timeout) {
      this.timeout(10000)
    }
    tryConnectAll(nodes, done)
  }

  const before = (done) => {
    if (this && this.timeout) {
      this.timeout(10000)
    }
    series([create, connect], done)
  }

  const after = function (done) {
    if (this && this.timeout) {
      this.timeout(10000)
    }
    if (!nodes) { return done() }

    each(nodes, (node, cb) => {
      series([
        (cb) => node.stop(cb)
      ], cb)
    }, done)
  }

  return {
    create,
    connect,
    tryConnectAll: tryConnectAllFn,
    before,
    after,
    things: () => nodes,
    connManagers: () => nodes.map((node) => node.connectionManager)
  }
}
