import { expect } from 'aegir/chai'
import { isAsyncGenerator } from '../src/is-async-generator.js'

describe('is-async-generator', () => {
  it('should return true if the value is an async generator', () => {
    async function * asyncGen (): AsyncGenerator<number> {
      yield 1
    }
    const asyncGenerator = asyncGen()
    expect(isAsyncGenerator(asyncGenerator)).to.be.true()

    const asyncGenObj = (async function * () {
      yield 1
    })()
    expect(isAsyncGenerator(asyncGenObj)).to.be.true()
  })

  it('should return false if the value is not an async generator', () => {
    expect(isAsyncGenerator(1)).to.be.false()
    expect(isAsyncGenerator('string')).to.be.false()
    expect(isAsyncGenerator({})).to.be.false()
    expect(isAsyncGenerator([])).to.be.false()
    expect(isAsyncGenerator(null)).to.be.false()
    expect(isAsyncGenerator(undefined)).to.be.false()
    expect(isAsyncGenerator(() => {})).to.be.false()
    expect(isAsyncGenerator(async () => {})).to.be.false()
    expect(
      isAsyncGenerator(function * () {
        yield 1
      })
    ).to.be.false()
    expect(
      isAsyncGenerator(async function * () {
        yield 1
      })
    ).to.be.false() // async generator function, not generator
    expect(isAsyncGenerator(Promise.resolve())).to.be.false()
    expect(isAsyncGenerator({ next: async () => {} })).to.be.false()
    expect(isAsyncGenerator({ [Symbol.asyncIterator]: () => {} })).to.be.false()
  })
})
