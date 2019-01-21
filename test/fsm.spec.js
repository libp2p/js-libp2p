/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-checkmark'))
const expect = chai.expect
const sinon = require('sinon')
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
      sinon.restore()
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

    it('should callback with an error when it occurs on stop', (done) => {
      const error = new Error('some error starting')
      node.once('start', () => {
        node.once('error', (err) => {
          expect(err).to.eql(error).mark()
        })
        node.stop((err) => {
          expect(err).to.not.exist().mark()
        })
      })

      expect(2).checks(done)

      sinon.stub(node._switch, 'stop').callsArgWith(0, error)
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

    it('should error on start with no transports', (done) => {
      let transports = node._modules.transport
      node._modules.transport = null

      node.on('stop', () => {
        node._modules.transport = transports
        expect(node._modules.transport).to.exist().mark()
      })
      node.on('error', (err) => {
        expect(err).to.exist().mark()
      })
      node.on('start', () => {
        throw new Error('should not start')
      })

      expect(2).checks(done)

      node.start()
    })

    it('should not start if the switch fails to start', (done) => {
      const error = new Error('switch didnt start')
      const stub = sinon.stub(node._switch, 'start')
        .callsArgWith(0, error)

      node.on('stop', () => {
        expect(stub.calledOnce).to.eql(true).mark()
        stub.restore()
      })
      node.on('error', (err) => {
        expect(err).to.eql(error).mark()
      })
      node.on('start', () => {
        throw new Error('should not start')
      })

      expect(3).checks(done)

      node.start((err) => {
        expect(err).to.eql(error).mark()
      })
    })

    it('should not dial when the node is stopped', (done) => {
      node.on('stop', () => {
        node.dial(null, (err) => {
          expect(err).to.exist()
          expect(err.code).to.eql('ERR_NODE_NOT_STARTED')
          done()
        })
      })

      node.stop()
    })

    it('should not dial (fsm) when the node is stopped', (done) => {
      node.on('stop', () => {
        node.dialFSM(null, null, (err) => {
          expect(err).to.exist()
          expect(err.code).to.eql('ERR_NODE_NOT_STARTED')
          done()
        })
      })

      node.stop()
    })
  })
})
