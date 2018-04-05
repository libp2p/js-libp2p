'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const waterfall = require('async/waterfall')
const series = require('async/series')
const each = require('async/each')

const createThing = require('./create-thing')
const connectAll = require('./connect-all')

module.exports = (count) => {
  let nodes

  const before = (done) => {
    waterfall([
      (cb) => {
        const tasks = []
        for (let i = 0; i < count; i++) {
          tasks.push((cb) => createThing({}, cb))
        }

        series(tasks, cb)
      },
      (things, cb) => {
        expect(things.length).to.equal(count)
        nodes = things
        connectAll(things, (err) => cb(err, things))
      }
    ], done)
  }

  const after = (done) => {
    if (!nodes) { return done() }

    each(nodes, (node, cb) => {
      node.connManager.stop()
      series([
        (cb) => node.libp2pNode.stop(cb),
        (cb) => node.repo.teardown(cb)
      ], cb)
    }, done)
  }

  return {
    before,
    after,
    connManagers: () => nodes.map((node) => node.connManager)
  }
}
