/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const identify = require('../src')

describe('identify', () => {
  it('multicodec', () => {
    expect(identify.multicodec).to.eql('/ipfs/id/1.0.0')
  })
})
