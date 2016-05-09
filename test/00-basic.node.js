/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const Swarm = require('../src')

describe('basics', () => {
  it('throws on missing peerInfo', () => {
    expect(() => Swarm()).to.throw(Error)
  })
})
