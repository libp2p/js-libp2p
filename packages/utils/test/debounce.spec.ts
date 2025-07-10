import { stop } from '@libp2p/interface'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { debounce } from '../src/debounce.js'

describe('debounce', () => {
  it('should debounce function', async () => {
    let invocations = 0
    const fn = (): void => {
      invocations++
    }

    const debounced = debounce(fn, 10)

    debounced()
    debounced()
    debounced()
    debounced()
    debounced()

    await delay(500)

    expect(invocations).to.equal(1)
  })

  it('should cancel debounced function', async () => {
    let invocations = 0
    const fn = (): void => {
      invocations++
    }

    const debounced = debounce(fn, 10000)

    debounced()
    debounced()
    debounced()
    debounced()
    debounced()

    await stop(debounced)

    await delay(500)

    expect(invocations).to.equal(0)
  })
})
