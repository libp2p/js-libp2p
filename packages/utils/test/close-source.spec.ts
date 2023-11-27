import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { closeSource } from '../src/close-source.js'
import type { Logger } from '@libp2p/interface'

describe('close source', () => {
  it('should close an async iterable', async () => {
    let count = 0
    const iterable = (async function * () {
      while (true) {
        yield count++
      }
    })()

    const val = await iterable.next()
    expect(val).to.have.property('done', false)
    expect(val).to.have.property('value', 0)

    closeSource(iterable, stubInterface<Logger>())

    const last = await iterable.next()
    expect(last).to.have.property('done', true)
    expect(last).to.have.property('value', undefined)
    expect(count).to.equal(1)
  })
})
