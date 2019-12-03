'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-as-promised'))
const { expect } = chai
const sinon = require('sinon')
const pDefer = require('p-defer')
const pWaitFor = require('p-wait-for')
const AggregateError = require('aggregate-error')
const { AbortError } = require('libp2p-interfaces/src/transport/errors')

const { DialResolver } = require('../../src/dialer/dial-request')

const mockAbortableDial = () => {
  const deferred = pDefer()
  function dial () {
    return {
      promise: deferred.promise,
      abort: () => deferred.reject(new AbortError())
    }
  }
  dial.reject = deferred.reject
  dial.resolve = deferred.resolve
  return dial
}

describe('DialResolver', () => {
  it('should not run subsequent dials if finished', async () => {
    const deferred = pDefer()
    const dial = sinon.stub().callsFake(() => {
      return deferred
    })
    const dialResolver = new DialResolver()
    dialResolver.add(dial)
    deferred.resolve(true)

    await pWaitFor(() => dialResolver.finished === true)

    dialResolver.add(dial)
    expect(dial.callCount).to.equal(1)
  })

  it('.flush should throw if all dials errored', async () => {
    const dialResolver = new DialResolver()
    const dials = [
      mockAbortableDial(),
      mockAbortableDial(),
      mockAbortableDial()
    ]
    for (const dial of dials) {
      dialResolver.add(dial)
      dial.reject(new Error('transport error'))
    }

    await expect(dialResolver.flush()).to.eventually.be.rejectedWith(AggregateError)
      .and.to.have.nested.property('._errors.length', 3)
  })

  it('.flush should resolve the successful dial', async () => {
    const dialResolver = new DialResolver()
    const mockConn = {}
    const dials = [
      mockAbortableDial(),
      mockAbortableDial(),
      mockAbortableDial()
    ]

    // Make the first succeed
    const successfulDial = dials.shift()
    dialResolver.add(successfulDial)
    successfulDial.resolve(mockConn)

    // Error the rest
    for (const dial of dials) {
      dialResolver.add(dial)
      dial.reject(new Error('transport error'))
    }

    await expect(dialResolver.flush()).to.eventually.be(mockConn)
  })
})
