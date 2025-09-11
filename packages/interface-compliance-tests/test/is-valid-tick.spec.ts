import { expect } from 'aegir/chai'
import { isValidTick } from '../src/is-valid-tick.js'

describe('is-valid-tick', () => {
  it('should validate tick', async () => {
    expect(isValidTick(Date.now())).to.be.true()
  })

  it('should validate tick within specified ms', async () => {
    expect(isValidTick(Date.now() - 100, 500)).to.be.true()
  })

  it('should not validate future tick', async () => {
    expect(isValidTick(Date.now() + 100)).to.be.false()
  })

  it('should not validate tick outside specified ms', async () => {
    expect(isValidTick(Date.now() - 100, 50)).to.be.false()
  })
})
