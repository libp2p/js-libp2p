/* eslint-env mocha */
import { expect } from 'aegir/chai'
import randomBytes from '../src/random-bytes.js'

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
    // @ts-expect-error invalid params
    expect(() => randomBytes('hi')).to.throw(Error).with.property('code', 'ERR_INVALID_LENGTH')
  })
})
