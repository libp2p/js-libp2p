/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const Swarm = require('../src')

describe('create Swarm instance', () => {
  it('throws on missing peerInfo', () => {
    expect(() => Swarm()).to.throw(Error)
  })
})
