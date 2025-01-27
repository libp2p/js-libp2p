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

  it('should return true if the value is a promise', () => {
    expect(isPromise(Promise.resolve())).to.be.true()
    expect(isPromise(new Promise(() => {}))).to.be.true()
    expect(isPromise(Promise.reject(new Error('test')))).to.be.true()
  })

  it('should return false if the value is not a promise', () => {
    expect(isPromise(1)).to.be.false()
    expect(isPromise('string')).to.be.false()
    expect(isPromise({})).to.be.false()
    expect(isPromise([])).to.be.false()
    expect(isPromise(null)).to.be.false()
    expect(isPromise(undefined)).to.be.false()
    expect(isPromise(() => {})).to.be.false()
    expect(isPromise(async () => {})).to.be.false()
    expect(
      isPromise(function * () {
        yield 1
      })
    ).to.be.false()
    expect(
      isPromise(async function * () {
        yield 1
      })
    ).to.be.false()
    expect(isPromise({ then: 1 })).to.be.false()
  })
})
