// ported from xxbloom - https://github.com/ceejbot/xxbloom/blob/master/LICENSE
import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { BloomFilter } from '../src/bloom-filter.js'

function hasBitsSet (buffer: Uint8Array): number {
  let isset = 0
  for (let i = 0; i < buffer.length; i++) {
    isset |= (buffer[i] !== 0 ? 1 : 0)
  }
  return isset
}

describe('bloom-filter', () => {
  it('constructs a filter of the requested size', () => {
    const filter = new BloomFilter({ hashes: 4, bits: 32 })
    expect(filter.seeds).to.have.lengthOf(4)
    expect(filter.bits).to.equal(32)
    expect(filter.buffer).to.be.an.instanceOf(Uint8Array)
  })

  it('zeroes out its storage buffer', () => {
    const filter = new BloomFilter({ hashes: 3, bits: 64 })
    for (let i = 0; i < filter.buffer.length; i++) {
      expect(filter.buffer[i]).to.equal(0)
    }
  })

  it('uses passed-in seeds if provided', () => {
    const filter = new BloomFilter({ bits: 256, seeds: [1, 2, 3, 4, 5] })
    expect(filter.seeds.length).to.equal(5)
    expect(filter.seeds[0]).to.equal(1)
    expect(filter.seeds[4]).to.equal(5)
  })

  describe('createOptimal()', () => {
    it('creates a filter with good defaults', () => {
      let filter = BloomFilter.create(95)
      expect(filter.bits).to.equal(1048)
      expect(filter.seeds.length).to.equal(8)

      filter = BloomFilter.create(148)
      expect(filter.bits).to.equal(1632)
      expect(filter.seeds.length).to.equal(8)

      filter = BloomFilter.create(10)
      expect(filter.bits).to.equal(110)
      expect(filter.seeds.length).to.equal(8)
    })

    it('createOptimal() lets you specify an error rate', () => {
      let filter = BloomFilter.create(20000)
      expect(filter.bits).to.equal(220555)
      const previous = filter.bits

      filter = BloomFilter.create(20000, 0.2)
      expect(filter.bits).to.be.below(previous)
    })
  })

  describe('setbit() and getbit()', () => {
    it('sets the specified bit', () => {
      const filter = new BloomFilter({ hashes: 3, bits: 16 })

      filter.setbit(0)
      let val = filter.getbit(0)
      expect(val).to.equal(true)

      filter.setbit(1)
      val = filter.getbit(1)
      expect(val).to.equal(true)

      val = filter.getbit(2)
      expect(val).to.equal(false)

      filter.setbit(10)
      val = filter.getbit(10)
      expect(val).to.equal(true)
    })

    it('can set all bits', () => {
      let i: number
      let value: number

      const filter = new BloomFilter({ hashes: 3, bits: 16 })
      expect(filter.buffer.length).to.equal(2)

      for (i = 0; i < 16; i++) {
        filter.setbit(i)
      }

      for (i = 0; i < 2; i++) {
        value = filter.buffer[i]
        expect(value).to.equal(255)
      }
    })

    it('slides over into the next buffer slice when setting bits', () => {
      let val
      const filter = new BloomFilter({ hashes: 3, bits: 64 })

      filter.setbit(8)
      val = filter.buffer[1]
      expect(val).to.equal(1)

      filter.setbit(17)
      val = filter.buffer[2]
      expect(val).to.equal(2)

      filter.setbit(34)
      val = filter.buffer[4]
      expect(val).to.equal(4)
    })
  })

  describe('add()', () => {
    it('can store buffers', () => {
      const filter = new BloomFilter({ hashes: 4, bits: 128 })

      expect(hasBitsSet(filter.buffer)).to.equal(0)
      filter.add(uint8ArrayFromString('cat'))
      expect(hasBitsSet(filter.buffer)).to.equal(1)
    })

    it('can store strings', () => {
      const filter = new BloomFilter({ hashes: 4, bits: 128 })
      filter.add('cat')

      expect(hasBitsSet(filter.buffer)).to.equal(1)
    })

    it('can add a hundred random items', () => {
      const alpha = '0123456789abcdefghijklmnopqrstuvwxyz'
      function randomWord (length?: number): string {
        length = length ?? Math.ceil(Math.random() * 20)
        let result = ''
        for (let i = 0; i < length; i++) {
          result += alpha[Math.floor(Math.random() * alpha.length)]
        }

        return result
      }

      const filter = BloomFilter.create(100)
      const words: string[] = []

      for (let i = 0; i < 100; i++) {
        const w = randomWord()
        words.push(w)
        filter.add(w)
      }

      for (let i = 0; i < words.length; i++) {
        expect(filter.has(words[i])).to.equal(true)
      }
    })
  })

  describe('has()', () => {
    it('returns true when called on a stored item', () => {
      const filter = new BloomFilter({ hashes: 3, bits: 16 })
      filter.add('cat')

      expect(hasBitsSet(filter.buffer)).to.equal(1)
      expect(filter.has('cat')).to.be.true()
    })

    it('returns false for items not in the set (mostly)', () => {
      const filter = new BloomFilter({ hashes: 4, bits: 50 })
      filter.add('cat')
      expect(filter.has('dog')).to.be.false()
    })

    it('responds appropriately for arrays of added items', () => {
      const filter = new BloomFilter({ hashes: 3, bits: 128 })
      filter.add('cat')
      filter.add('dog')
      filter.add('wallaby')

      expect(filter.has('cat')).to.equal(true)
      expect(filter.has('dog')).to.equal(true)
      expect(filter.has('wallaby')).to.equal(true)
      expect(filter.has('orange')).to.equal(false)
    })
  })

  describe('clear()', () => {
    it('clears the filter', () => {
      const filter = new BloomFilter({ hashes: 3, bits: 128 })
      filter.add('cat')
      filter.add('dog')
      filter.add('wallaby')
      expect(hasBitsSet(filter.buffer)).to.equal(1)

      filter.clear()
      expect(hasBitsSet(filter.buffer)).to.equal(0)
    })
  })
})
