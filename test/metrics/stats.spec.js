'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')

const Stats = require('../../src/metrics/stats')

describe('Stats', () => {
  it('should produce a deep clone on snapshot', () => {
    const stats = new Stats(['another_counter'], { movingAverageIntervals: [] })
    const snapshot = stats.snapshot
    expect(stats._stats.dataReceived).to.not.equal(snapshot.dataReceived)
  })
})
