/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const randomBytes = require('../src/random-bytes')

describe('randomBytes', () => {
  it('produces random bytes', () => {
    expect(randomBytes(16)).to.have.length(16)
  })

  it('throws if length is 0', () => {
    expect(() => randomBytes(0)).to.throw(Error).with.property('code', 'ERR_INVALID_LENGTH')
  })

  it('throws if length is < 0', () => {
    expect(() => randomBytes(-1)).to.throw(Error).with.property('code', 'ERR_INVALID_LENGTH')
  })

  it('throws if length is not a number', () => {
    expect(() => randomBytes('hi')).to.throw(Error).with.property('code', 'ERR_INVALID_LENGTH')
  })
})
