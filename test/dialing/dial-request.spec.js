'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')

const { AbortError } = require('libp2p-interfaces/src/transport/errors')
const AbortController = require('abort-controller')
const AggregateError = require('aggregate-error')
const pDefer = require('p-defer')
const delay = require('delay')

const DialRequest = require('../../src/dialer/dial-request')
const createMockConnection = require('../utils/mockConnection')
const error = new Error('dial failes')

describe('Dial Request', () => {
  it('should end when a single multiaddr dials succeeds', async () => {
    const mockConnection = await createMockConnection()
    const actions = {
      1: () => Promise.reject(error),
      2: () => Promise.resolve(mockConnection),
      3: () => Promise.reject(error)
    }
    const dialAction = (num) => actions[num]()
    const tokens = ['a', 'b']
    const controller = new AbortController()
    const dialer = {
      getTokens: () => [...tokens],
      releaseToken: () => {}
    }

    const dialRequest = new DialRequest({
      addrs: Object.keys(actions),
      dialer,
      dialAction
    })

    sinon.spy(actions, 1)
    sinon.spy(actions, 2)
    sinon.spy(actions, 3)
    sinon.spy(dialer, 'releaseToken')
    const result = await dialRequest.run({ signal: controller.signal })
    expect(result).to.equal(mockConnection)
    expect(actions[1]).to.have.property('callCount', 1)
    expect(actions[2]).to.have.property('callCount', 1)
    expect(actions[3]).to.have.property('callCount', 0)
    expect(dialer.releaseToken).to.have.property('callCount', tokens.length)
  })

  it('should release tokens when all addr dials have started', async () => {
    const mockConnection = await createMockConnection()
    const firstDials = pDefer()
    const deferred = pDefer()
    const actions = {
      1: () => firstDials.promise,
      2: () => firstDials.promise,
      3: () => deferred.promise
    }
    const dialAction = (num) => actions[num]()
    const tokens = ['a', 'b']
    const controller = new AbortController()
    const dialer = {
      getTokens: () => [...tokens],
      releaseToken: () => {}
    }

    const dialRequest = new DialRequest({
      addrs: Object.keys(actions),
      dialer,
      dialAction
    })

    sinon.spy(actions, 1)
    sinon.spy(actions, 2)
    sinon.spy(actions, 3)
    sinon.spy(dialer, 'releaseToken')
    dialRequest.run({ signal: controller.signal })
    // Let the first dials run
    await delay(0)

    // Finish the first 2 dials
    firstDials.reject(error)
    await delay(0)

    // Only 1 dial should remain, so 1 token should have been released
    expect(actions[1]).to.have.property('callCount', 1)
    expect(actions[2]).to.have.property('callCount', 1)
    expect(actions[3]).to.have.property('callCount', 1)
    expect(dialer.releaseToken).to.have.property('callCount', 1)

    // Finish the dial and release the 2nd token
    deferred.resolve(mockConnection)
    await delay(0)
    expect(dialer.releaseToken).to.have.property('callCount', 2)
  })

  it('should throw an AggregateError if all dials fail', async () => {
    const actions = {
      1: () => Promise.reject(error),
      2: () => Promise.reject(error),
      3: () => Promise.reject(error)
    }
    const dialAction = (num) => actions[num]()
    const addrs = Object.keys(actions)
    const tokens = ['a', 'b']
    const controller = new AbortController()
    const dialer = {
      getTokens: () => [...tokens],
      releaseToken: () => {}
    }

    const dialRequest = new DialRequest({
      addrs,
      dialer,
      dialAction
    })

    sinon.spy(actions, 1)
    sinon.spy(actions, 2)
    sinon.spy(actions, 3)
    sinon.spy(dialer, 'getTokens')
    sinon.spy(dialer, 'releaseToken')

    try {
      await dialRequest.run({ signal: controller.signal })
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).to.be.an.instanceof(AggregateError)
    }

    expect(actions[1]).to.have.property('callCount', 1)
    expect(actions[2]).to.have.property('callCount', 1)
    expect(actions[3]).to.have.property('callCount', 1)
    expect(dialer.getTokens.calledWith(addrs.length)).to.equal(true)
    expect(dialer.releaseToken).to.have.property('callCount', tokens.length)
  })

  it('should handle a large number of addrs', async () => {
    const reject = sinon.stub().callsFake(() => Promise.reject(error))
    const actions = {}
    const addrs = [...new Array(25)].map((_, index) => index + 1)
    addrs.forEach(addr => {
      actions[addr] = reject
    })

    const dialAction = (addr) => actions[addr]()
    const tokens = ['a', 'b']
    const controller = new AbortController()
    const dialer = {
      getTokens: () => [...tokens],
      releaseToken: () => {}
    }

    const dialRequest = new DialRequest({
      addrs,
      dialer,
      dialAction
    })

    sinon.spy(dialer, 'releaseToken')
    try {
      await dialRequest.run({ signal: controller.signal })
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).to.be.an.instanceof(AggregateError)
    }

    expect(reject).to.have.property('callCount', addrs.length)
    expect(dialer.releaseToken).to.have.property('callCount', tokens.length)
  })

  it('should abort all dials when its signal is aborted', async () => {
    const deferToAbort = ({ signal }) => {
      if (signal.aborted) throw new Error('already aborted')
      const deferred = pDefer()
      const onAbort = () => {
        deferred.reject(new AbortError())
        signal.removeEventListener('abort', onAbort)
      }
      signal.addEventListener('abort', onAbort)
      return deferred.promise
    }

    const actions = {
      1: deferToAbort,
      2: deferToAbort,
      3: deferToAbort
    }
    const dialAction = (num, opts) => actions[num](opts)
    const addrs = Object.keys(actions)
    const tokens = ['a', 'b']
    const controller = new AbortController()
    const dialer = {
      getTokens: () => [...tokens],
      releaseToken: () => {}
    }

    const dialRequest = new DialRequest({
      addrs,
      dialer,
      dialAction
    })

    sinon.spy(actions, 1)
    sinon.spy(actions, 2)
    sinon.spy(actions, 3)
    sinon.spy(dialer, 'getTokens')
    sinon.spy(dialer, 'releaseToken')

    try {
      setTimeout(() => controller.abort(), 100)
      await dialRequest.run({ signal: controller.signal })
      expect.fail('dial should have failed')
    } catch (err) {
      expect(err).to.be.an.instanceof(AggregateError)
    }

    expect(actions[1]).to.have.property('callCount', 1)
    expect(actions[2]).to.have.property('callCount', 1)
    expect(actions[3]).to.have.property('callCount', 1)
    expect(dialer.getTokens.calledWith(addrs.length)).to.equal(true)
    expect(dialer.releaseToken).to.have.property('callCount', tokens.length)
  })
})
