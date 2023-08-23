import { expect } from 'aegir/chai'
import { isSubset } from '../../src/utils/is-subset.js'

describe('test helpers', () => {
  it('correctly checks subsets', () => {
    const testCases = [
      { a: [[1, 2, 3]], b: [[4, 5, 6]], isSubset: false },
      { a: [[1, 2, 3], [4, 5, 6]], b: [[1, 2, 3]], isSubset: true },
      { a: [[1, 2, 3], [4, 5, 6]], b: [], isSubset: true },
      { a: [], b: [[1, 2, 3]], isSubset: false },
      { a: [], b: [], isSubset: true },
      { a: [[1, 2, 3]], b: [[1, 2, 3], [4, 5, 6]], isSubset: false },
      { a: [[1, 2, 3]], b: [[1, 2]], isSubset: false }
    ]

    for (const tc of testCases) {
      expect(isSubset(tc.a.map(b => new Uint8Array(b)), tc.b.map(b => new Uint8Array(b)))).to.equal(tc.isSubset)
    }
  })
})
