/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Switch = require('../src')

describe('create Switch instance', () => {
  it('throws on missing peerInfo', () => {
    expect(() => new Switch()).to.throw(/You must provide a `peerInfo`/)
  })
})
