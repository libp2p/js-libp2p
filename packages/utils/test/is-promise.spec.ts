import { expect } from 'aegir/chai'
import { isPromise } from '../src/is-promise.js'

describe('is-promise', () => {
  it('should detect Promise.resolve', () => {
    expect(isPromise(Promise.resolve('ok'))).to.be.true()
  })

  it('should detect Promise.reject', () => {
    expect(isPromise(Promise.reject(new Error('not ok')).catch(() => {
      // prevent unhandled promise rejection
    }))).to.be.true()
  })

  it('should detect new Promise', () => {
    expect(isPromise(new Promise((resolve, reject) => {}))).to.be.true()
  })

  it('should not detect boolean', () => {
    expect(isPromise(true)).to.be.false()
  })

  it('should not detect object', () => {
    expect(isPromise({})).to.be.false()
  })

  it('should not detect number', () => {
    expect(isPromise({})).to.be.false()
  })

  it('should not detect partial promise', () => {
    expect(isPromise({ then: true })).to.be.false()
  })
})
