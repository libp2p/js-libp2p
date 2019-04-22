/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-checkmark'))
const expect = chai.expect
const sinon = require('sinon')
const RandomWalk = require('../src/random-walk')
const { defaultRandomWalk } = require('../src/constants')
const { AssertionError } = require('assert')

describe('Random Walk', () => {
  let mockDHT = {
    peerInfo: {
      id: {
        toB58String: () => 'QmRLoXS3E73psYaUsma1VSbboTa2J8Z9kso1tpiGLk9WQ4'
      }
    },
    findPeer: () => {}
  }

  afterEach(() => {
    sinon.restore()
  })

  describe('configuration', () => {
    it('should use require a dht', () => {
      expect(() => new RandomWalk()).to.throw(AssertionError)
    })

    it('should use defaults', () => {
      const randomWalk = new RandomWalk(mockDHT)
      expect(randomWalk._options).to.eql(defaultRandomWalk)
    })

    it('should be able to set options', () => {
      const options = {
        enabled: false,
        queriesPerPeriod: 2,
        interval: 300e3,
        timeout: 30e3,
        delay: 1e3
      }

      const randomWalk = new RandomWalk(mockDHT, options)
      expect(randomWalk._options).to.eql(options)
    })
  })

  describe('walk', () => {
    let randomWalk
    before(() => {
      randomWalk = new RandomWalk(mockDHT)
    })

    it('should be able to specify the number of queries', (done) => {
      const queries = 5
      sinon.stub(randomWalk, '_query').callsArgWith(2, null)
      randomWalk._walk(queries, 1e3, (err) => {
        expect(err).to.not.exist()
        expect(randomWalk._query.callCount).to.eql(queries)
        done()
      })
    })

    it('should stop walking if a query errors', (done) => {
      const queries = 5
      const error = new Error('ERR_BOOM')
      const findPeerStub = sinon.stub(randomWalk._kadDHT, 'findPeer')
      findPeerStub.onCall(2).callsArgWith(2, error)
      findPeerStub.callsArgWith(2, { code: 'ERR_NOT_FOUND' })

      randomWalk._walk(queries, 1e3, (err) => {
        expect(err).to.eql(error)
        // 2 successes and error on the 3rd
        expect(findPeerStub.callCount).to.eql(3)
        done()
      })
    })

    it('should ignore timeout errors and keep walking', (done) => {
      const queries = 5
      const _queryStub = sinon.stub(randomWalk, '_query')
      _queryStub.onCall(2).callsArgWith(2, {
        code: 'ETIMEDOUT'
      })
      _queryStub.callsArgWith(2, null)

      randomWalk._walk(queries, 1e3, (err) => {
        expect(err).to.not.exist()
        expect(randomWalk._query.callCount).to.eql(queries)
        done()
      })
    })

    it('should pass its timeout to the find peer query', (done) => {
      sinon.stub(randomWalk._kadDHT, 'findPeer').callsArgWith(2, { code: 'ERR_NOT_FOUND' })

      randomWalk._walk(1, 111, (err) => {
        const mockCalls = randomWalk._kadDHT.findPeer.getCalls()
        expect(err).to.not.exist()
        expect(mockCalls).to.have.length(1)
        expect(mockCalls[0].args[1]).to.include({
          timeout: 111
        })
        done()
      })
    })

    it('should error if the random id peer is found', (done) => {
      const queries = 5
      const findPeerStub = sinon.stub(randomWalk._kadDHT, 'findPeer').callsArgWith(2, { code: 'ERR_NOT_FOUND' })
      findPeerStub.onCall(2).callsArgWith(2, null, {
        id: 'QmB'
      })

      randomWalk._walk(queries, 1e3, (err) => {
        expect(err).to.exist()
        expect(findPeerStub.callCount).to.eql(3)
        done()
      })
    })

    it('should error if random id generation errors', (done) => {
      const error = new Error('ERR_BOOM')
      sinon.stub(randomWalk, '_randomPeerId').callsArgWith(0, error)
      randomWalk._walk(1, 1e3, (err) => {
        expect(err).to.eql(error)
        done()
      })
    })
  })

  describe('start', () => {
    it('should not start if it is running', (done) => {
      const randomWalk = new RandomWalk(mockDHT, {
        enabled: true,
        delay: 0,
        interval: 100
      })
      sinon.spy(randomWalk, '_runPeriodically')

      sinon.stub(randomWalk, '_walk').callsFake(() => {
        // Try to start again
        randomWalk.start()

        // Wait a tick to allow the 0ms delay to trigger
        setTimeout(() => {
          expect(randomWalk._runPeriodically.callCount).to.eql(1)
          randomWalk.stop()
          done()
        })
      })

      randomWalk.start()
    })

    it('should not start if it is not enabled', (done) => {
      const randomWalk = new RandomWalk(mockDHT, {
        enabled: false
      })
      sinon.stub(randomWalk, '_runPeriodically')

      randomWalk.start()

      // Wait a tick
      setTimeout(() => {
        expect(randomWalk._runPeriodically.callCount).to.eql(0)
        randomWalk.stop()
        done()
      })
    })

    it('should start if not running and enabled', (done) => {
      const options = {
        enabled: true,
        delay: 0,
        timeout: 3e3,
        queriesPerPeriod: 1
      }
      const randomWalk = new RandomWalk(mockDHT, options)
      sinon.stub(randomWalk, '_walk').callsFake((queries, timeout) => {
        expect(queries).to.eql(options.queriesPerPeriod)
        expect(timeout).to.eql(options.timeout)
        done()
      })
      randomWalk.start()
    })

    it('should run the query on interval', (done) => {
      const options = {
        enabled: true,
        delay: 0,
        timeout: 3e3,
        interval: 100,
        queriesPerPeriod: 1
      }
      const error = { code: 'ERR_NOT_FOUND' }
      const randomWalk = new RandomWalk(mockDHT, options)
      sinon.stub(randomWalk._kadDHT, 'findPeer').callsFake((_, opts, callback) => {
        expect(opts.timeout).to.eql(options.timeout).mark()
        callback(error)
      })

      expect(3).checks(() => {
        randomWalk.stop()
        expect(randomWalk._kadDHT.findPeer.callCount).to.eql(3)
        done()
      })

      randomWalk.start()
    })
  })

  describe('stop', () => {
    it('should not throw if already stopped', () => {
      const randomWalk = new RandomWalk(mockDHT, {
        enabled: true,
        delay: 0,
        interval: 100
      })

      expect(() => randomWalk.stop()).to.not.throw()
    })

    it('should cancel the timer if the walk is not active', () => {
      const randomWalk = new RandomWalk(mockDHT, {
        enabled: true,
        delay: 100e3,
        interval: 100e3
      })
      randomWalk.start()
      expect(randomWalk._timeoutId).to.exist()
      randomWalk.stop()
      expect(randomWalk._timeoutId).to.not.exist()
    })

    it('should cancel the walk if already running', (done) => {
      const randomWalk = new RandomWalk(mockDHT, {
        enabled: true,
        delay: 0,
        timeout: 100e3,
        interval: 100e3
      })
      sinon.stub(randomWalk._kadDHT, 'findPeer').callsFake((id, options) => {
        options.signal.addEventListener('abort', () => {
          expect(randomWalk._timeoutId).to.not.exist()
          options.signal.removeEventListener('abort')
          done()
        })
        randomWalk.stop()
      })

      randomWalk.start()
    })
  })
})
