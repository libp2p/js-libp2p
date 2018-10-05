/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-checkmark'))
const expect = chai.expect
const series = require('async/series')
const createNode = require('./utils/create-node')

describe('libp2p state machine (fsm)', () => {
  describe('starting and stopping', () => {
    let node
    beforeEach((done) => {
      createNode([], (err, _node) => {
        node = _node
        done(err)
      })
    })
    afterEach(() => {
      node.removeAllListeners()
    })
    after((done) => {
      node.stop(done)
      node = null
    })

    it('should be able to start and stop several times', (done) => {
      node.on('start', (err) => {
        expect(err).to.not.exist().mark()
      })
      node.on('stop', (err) => {
        expect(err).to.not.exist().mark()
      })

      expect(4).checks(done)

      series([
        (cb) => node.start(cb),
        (cb) => node.stop(cb),
        (cb) => node.start(cb),
        (cb) => node.stop(cb)
      ], () => {})
    })

    it('should noop when stopping a stopped node', (done) => {
      node.once('start', node.stop)
      node.once('stop', () => {
        node.state.on('STOPPING', () => {
          throw new Error('should not stop a stopped node')
        })
        node.once('stop', done)

        // stop the stopped node
        node.stop()
      })
      node.start()
    })

    it('should noop when starting a started node', (done) => {
      node.once('start', () => {
        node.state.on('STARTING', () => {
          throw new Error('should not start a started node')
        })
        node.once('start', () => {
          node.once('stop', done)
          node.stop()
        })

        // start the started node
        node.start()
      })
      node.start()
    })
  })
})
