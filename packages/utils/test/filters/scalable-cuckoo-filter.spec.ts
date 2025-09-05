import { randomBytes } from '@libp2p/crypto'
import { expect } from 'aegir/chai'
import { ScalableCuckooFilter, createScalableCuckooFilter } from '../../src/filters/scalable-cuckoo-filter.ts'

describe('scalable-cuckoo-filter', () => {
  let keys: Uint8Array[]
  let cuckoo: ScalableCuckooFilter

  beforeEach(() => {
    keys = []
    cuckoo = new ScalableCuckooFilter({
      filterSize: 1500,
      bucketSize: 6,
      fingerprintSize: 4
    })
  })

  it('add 150k keys', () => {
    for (let i = 0; i < 150000; i++) {
      const rand = randomBytes(36)
      keys.push(rand)

      expect(cuckoo.add(rand)).to.be.true()
    }

    // collisions may occur
    expect(cuckoo.count).to.be.greaterThan(140000)
    expect(cuckoo).to.have.nested.property('filterSeries.length')
      .that.is.greaterThan(1)
  })

  it('check keys are in filter', () => {
    for (const key of keys) {
      expect(cuckoo.has(key)).to.be.true()
    }
  })

  it('removes keys', () => {
    for (const key of keys) {
      expect(cuckoo.remove(key)).to.be.true()
      expect(cuckoo.has(key)).to.be.false()
    }

    expect(cuckoo.count).to.equal(0)
  })

  it('optimizes input', () => {
    const filter = createScalableCuckooFilter(100000, 0.001)
    const key = randomBytes(32)

    filter.add(key)

    expect(filter.has(key)).to.equal(true)
  })
})
