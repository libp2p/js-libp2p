/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const identify = require('../src')

describe('identify', () => {
  it('multicodec', () => {
    expect(
      identify.multicodec
    ).to.be.eql(
      '/ipfs/id/1.0.0'
    )
  })
})
