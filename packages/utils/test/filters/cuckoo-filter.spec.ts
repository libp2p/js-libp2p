import { randomBytes } from '@libp2p/crypto'
import { expect } from 'aegir/chai'
import { CuckooFilter } from '../../src/filters/cuckoo-filter.ts'

describe('cuckoo-filter', () => {
  let keys: Uint8Array[]
  let cuckoo: CuckooFilter

  beforeEach(() => {
    keys = []
    cuckoo = new CuckooFilter({
      filterSize: 1500,
      bucketSize: 6,
      fingerprintSize: 4
    })
  })

  it('add 1500 keys', () => {
    for (let i = 0; i < 1500; i++) {
      const rand = randomBytes(36)
      keys.push(rand)

      expect(cuckoo.add(rand)).to.be.true()
    }

    expect(cuckoo.count).to.equal(1500)
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

  it('becomes unreliable', () => {
    while (true) {
      cuckoo.add(randomBytes(36))

      if (!cuckoo.reliable) {
        break
      }
    }
  })
})
