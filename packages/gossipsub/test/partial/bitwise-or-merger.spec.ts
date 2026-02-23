import { expect } from 'aegir/chai'
import { BitwiseOrMerger } from '../../src/partial/bitwise-or-merger.js'

describe('BitwiseOrMerger', () => {
  const merger = new BitwiseOrMerger()

  it('should merge two equal-length buffers with bitwise OR', () => {
    const a = new Uint8Array([0b1010, 0b0011])
    const b = new Uint8Array([0b0101, 0b1100])
    const result = merger.merge(a, b)
    expect(result).to.deep.equal(new Uint8Array([0b1111, 0b1111]))
  })

  it('should handle different-length buffers by padding shorter one with zeros', () => {
    const a = new Uint8Array([0b1010])
    const b = new Uint8Array([0b0101, 0b1100])
    const result = merger.merge(a, b)
    expect(result).to.deep.equal(new Uint8Array([0b1111, 0b1100]))
  })

  it('should handle empty buffer with non-empty buffer', () => {
    const a = new Uint8Array([])
    const b = new Uint8Array([0b1010, 0b0101])
    const result = merger.merge(a, b)
    expect(result).to.deep.equal(new Uint8Array([0b1010, 0b0101]))
  })

  it('should handle two empty buffers', () => {
    const a = new Uint8Array([])
    const b = new Uint8Array([])
    const result = merger.merge(a, b)
    expect(result).to.deep.equal(new Uint8Array([]))
  })

  it('should handle identical buffers', () => {
    const a = new Uint8Array([0b1010, 0b0101])
    const b = new Uint8Array([0b1010, 0b0101])
    const result = merger.merge(a, b)
    expect(result).to.deep.equal(new Uint8Array([0b1010, 0b0101]))
  })

  it('should merge with all zeros', () => {
    const a = new Uint8Array([0, 0])
    const b = new Uint8Array([0b1111, 0b1111])
    const result = merger.merge(a, b)
    expect(result).to.deep.equal(new Uint8Array([0b1111, 0b1111]))
  })

  it('should merge with all ones', () => {
    const a = new Uint8Array([0xFF, 0xFF])
    const b = new Uint8Array([0b1010, 0b0101])
    const result = merger.merge(a, b)
    expect(result).to.deep.equal(new Uint8Array([0xFF, 0xFF]))
  })
})
