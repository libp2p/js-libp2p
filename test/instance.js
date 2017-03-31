/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Swarm = require('../src')

describe('create Swarm instance', () => {
  it('throws on missing peerInfo', () => {
    expect(() => Swarm()).to.throw(Error)
  })
})
