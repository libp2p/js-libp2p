import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { AdaptiveTimeout, DEFAULT_MIN_TIMEOUT, DEFAULT_TIMEOUT_MULTIPLIER } from '../src/adaptive-timeout.js'
import type { SinonFakeTimers } from 'sinon'

describe('adaptive-timeout', () => {
  let clock: SinonFakeTimers

  beforeEach(() => {
    clock = Sinon.useFakeTimers()
  })

  afterEach(() => {
    clock.restore()
  })

  it('should return an initial signal with a default timeout', () => {
    const adaptiveTimeout = new AdaptiveTimeout()
    const signal = adaptiveTimeout.getTimeoutSignal()

    expect(signal).to.have.property('timeout', DEFAULT_MIN_TIMEOUT)

    adaptiveTimeout.cleanUp(signal)
  })

  it('should adapt the timeout to previous values', () => {
    const adaptiveTimeout = new AdaptiveTimeout()
    const signal1 = adaptiveTimeout.getTimeoutSignal()

    clock.tick(5000)

    adaptiveTimeout.cleanUp(signal1)

    const signal2 = adaptiveTimeout.getTimeoutSignal()

    expect(signal2).to.have.property('timeout', 5000 * DEFAULT_TIMEOUT_MULTIPLIER)
  })

  it('should allow overriding the adapted timeout', () => {
    const adaptiveTimeout = new AdaptiveTimeout()
    const signal1 = adaptiveTimeout.getTimeoutSignal()

    clock.tick(5000)

    adaptiveTimeout.cleanUp(signal1)

    const signal2 = adaptiveTimeout.getTimeoutSignal({
      timeoutFactor: 1
    })

    expect(signal2).to.have.property('timeout', 5000)
  })

  it('should reduce the timeout', () => {
    const adaptiveTimeout = new AdaptiveTimeout()

    const signal1 = adaptiveTimeout.getTimeoutSignal()
    clock.tick(8000)
    adaptiveTimeout.cleanUp(signal1)

    const signal2 = adaptiveTimeout.getTimeoutSignal({
      timeoutFactor: 1
    })
    expect(signal2).to.have.property('timeout', 8000)
    clock.tick(6000)
    adaptiveTimeout.cleanUp(signal2)

    const signal3 = adaptiveTimeout.getTimeoutSignal({
      timeoutFactor: 1
    })
    expect(signal3).to.have.property('timeout', 6602)
  })

  it('should increase the timeout', () => {
    const adaptiveTimeout = new AdaptiveTimeout()

    const signal1 = adaptiveTimeout.getTimeoutSignal()
    clock.tick(8000)
    adaptiveTimeout.cleanUp(signal1)

    const signal2 = adaptiveTimeout.getTimeoutSignal({
      timeoutFactor: 1
    })
    expect(signal2).to.have.property('timeout', 8000)
    clock.tick(9000)
    adaptiveTimeout.cleanUp(signal2)

    const signal3 = adaptiveTimeout.getTimeoutSignal({
      timeoutFactor: 1
    })
    expect(signal3).to.have.property('timeout', 8835)
  })

  it('should wrap an existing signal', () => {
    const controller = new AbortController()
    const adaptiveTimeout = new AdaptiveTimeout()

    const signal = adaptiveTimeout.getTimeoutSignal({
      signal: controller.signal
    })

    expect(signal).to.have.property('aborted', false)

    controller.abort()

    expect(signal).to.have.property('aborted', true)

    adaptiveTimeout.cleanUp(signal)
  })

  it('should have a minimum timeout', () => {
    const adaptiveTimeout = new AdaptiveTimeout({
      minTimeout: 10_000
    })

    const signal1 = adaptiveTimeout.getTimeoutSignal()
    adaptiveTimeout.cleanUp(signal1)

    const signal2 = adaptiveTimeout.getTimeoutSignal()
    adaptiveTimeout.cleanUp(signal2)

    const signal3 = adaptiveTimeout.getTimeoutSignal()
    adaptiveTimeout.cleanUp(signal3)

    expect(signal3).to.have.property('timeout', 10_000)
  })

  it('should have a maximum timeout', () => {
    const adaptiveTimeout = new AdaptiveTimeout({
      maxTimeout: 10_000
    })

    const signal1 = adaptiveTimeout.getTimeoutSignal()
    clock.tick(20_000)
    adaptiveTimeout.cleanUp(signal1)

    const signal2 = adaptiveTimeout.getTimeoutSignal()
    clock.tick(20_000)
    adaptiveTimeout.cleanUp(signal2)

    const signal3 = adaptiveTimeout.getTimeoutSignal()
    clock.tick(20_000)
    adaptiveTimeout.cleanUp(signal3)

    expect(signal3).to.have.property('timeout', 10_000)
  })
})
