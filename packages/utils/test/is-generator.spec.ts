import { expect } from 'aegir/chai'
import { isGenerator } from '../src/is-generator.js'

describe('is-generator', () => {
  it('should return true if the value is a generator', () => {
    function * gen (): Generator<number> {
      yield 1
    }
    const generator = gen()
    expect(isGenerator(generator)).to.be.true()

    const genObj = (function * () {
      yield 1
    })()
    expect(isGenerator(genObj)).to.be.true()
  })

  it('should return false if the value is not a generator', () => {
    expect(isGenerator(1)).to.be.false()
    expect(isGenerator('string')).to.be.false()
    expect(isGenerator({})).to.be.false()
    expect(isGenerator([])).to.be.false()
    expect(isGenerator(null)).to.be.false()
    expect(isGenerator(undefined)).to.be.false()
    expect(isGenerator(() => {})).to.be.false()
    expect(isGenerator(async () => {})).to.be.false()
    expect(
      isGenerator(function * () {
        yield 1
      })
    ).to.be.false() // generator function, not generator
    expect(
      isGenerator(async function * () {
        yield 1
      })
    ).to.be.false()
    expect(isGenerator(Promise.resolve())).to.be.false()
    expect(isGenerator({ next: () => {} })).to.be.false()
    expect(isGenerator({ [Symbol.iterator]: () => {} })).to.be.false()
  })
})
