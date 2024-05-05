import { expect } from 'aegir/chai'
import { MovingAverage } from '../src/moving-average.js'

describe('moving-average', () => {
  it('moving average with one value gets that value', () => {
    const ma = new MovingAverage(5000)
    ma.push(5, Date.now())

    expect(ma).to.have.property('movingAverage', 5)
  })

  it('moving average on a constant value returns that value', () => {
    const ma = new MovingAverage(5000)

    const now = Date.now()
    ma.push(5, now)
    ma.push(5, now + 1000)
    ma.push(5, now + 2000)
    ma.push(5, now + 3000)

    expect(ma).to.have.property('movingAverage', 5)
  })

  it('moving average works', () => {
    const ma = new MovingAverage(50000)

    const now = Date.now()
    ma.push(1, now)
    ma.push(2, now + 1000)
    ma.push(3, now + 2000)
    ma.push(3, now + 3000)
    ma.push(10, now + 4000)

    expect(ma).to.have.property('movingAverage')
      .that.is.lessThan(1.28)
    expect(ma).to.have.property('movingAverage')
      .that.is.greaterThan(1.27)
  })

  it('variance is 0 on one sample', () => {
    const ma = new MovingAverage(5000)
    ma.push(5, Date.now())

    expect(ma).to.have.property('variance', 0)
  })

  it('variance is 0 on samples with same value', () => {
    const ma = new MovingAverage(5000)
    const now = Date.now()
    ma.push(3, now)
    ma.push(3, now + 1000)
    ma.push(3, now + 2000)
    ma.push(3, now + 3000)
    ma.push(3, now + 4000)

    expect(ma).to.have.property('variance', 0)
  })

  it('variance works (1)', () => {
    const ma = new MovingAverage(5000)
    const now = Date.now()
    ma.push(0, now)
    ma.push(1, now + 1000)
    ma.push(2, now + 2000)
    ma.push(3, now + 3000)
    ma.push(4, now + 4000)

    expect(ma).to.have.property('variance')
      .that.is.lessThan(2.54)
    expect(ma).to.have.property('variance')
      .that.is.greaterThan(2.53)
  })

  it('variance works (2)', () => {
    const ma = new MovingAverage(5000)
    const now = Date.now()
    ma.push(0, now)
    ma.push(1, now + 1000)
    ma.push(1, now + 2000)
    ma.push(1, now + 3000)
    ma.push(1, now + 4000)

    expect(ma).to.have.property('variance')
      .that.is.lessThan(0.25)
    expect(ma).to.have.property('variance')
      .that.is.greaterThan(0.24)
  })
})
