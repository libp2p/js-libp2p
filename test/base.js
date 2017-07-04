/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect

const libp2p = require('../src')

describe('libp2p', () => {
  it('the skeleton is fine, now go build your own libp2p bundle', () => {
    expect(libp2p).to.exist()
  })
})
