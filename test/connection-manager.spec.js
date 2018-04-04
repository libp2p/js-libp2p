/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const each = require('async/each')
const series = require('async/series')

const createThing = require('./utils/create-thing')
const connectAll = require('./utils/connect-all')

describe('connection manager', function () {
  let nodes

  before((done) => {
    series([
      (cb) => createThing({}, cb),
      (cb) => createThing({}, cb),
      (cb) => createThing({}, cb)
    ], (err, results) => {
      expect(err).to.not.exist()
      expect(results).to.have.length(3)
      nodes = results
      done()
    })
  })

  before((done) => {
    console.log('going to connect all!')
    connectAll(nodes, (err) => {
      if (err) {
        return done(err)
      }
      console.log('CONNECTED ALL!!')
      done()
    })
  })

  after((done) => {
    each(nodes, (node, cb) => {
      node.connManager.stop()
      series([
        (cb) => node.libp2pNode.stop(cb),
        (cb) => node.repo.teardown(cb)
      ], cb)
    }, done)
  })

  it('works', (done) => {
    setTimeout(done, 1900)
  })
})
