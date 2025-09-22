import { expect } from 'aegir/chai'
import { removeFirstNItemsFromSet, removeItemsFromSet } from '../../src/utils/set.js'

describe('Set util', function () {
  describe('removeItemsFromSet', function () {
    let s: Set<number>
    this.beforeEach(() => {
      s = new Set([1, 2, 3, 4, 5])
    })

    const testCases: Array<{ id: string, ineed: number, fn(item: number): boolean, result: Set<number> }> = [
      { id: 'remove even numbers - need 0', ineed: 0, fn: (item) => item % 2 === 0, result: new Set([]) },
      { id: 'remove even numbers - need 1', ineed: 1, fn: (item) => item % 2 === 0, result: new Set([2]) },
      { id: 'remove even numbers - need 2', ineed: 2, fn: (item) => item % 2 === 0, result: new Set([2, 4]) },
      { id: 'remove even numbers - need 10', ineed: 2, fn: (item) => item % 2 === 0, result: new Set([2, 4]) }
    ]

    for (const { id, ineed, fn, result } of testCases) {
      // eslint-disable-next-line no-loop-func
      it(id, () => {
        expect(removeItemsFromSet(s, ineed, fn)).to.deep.equal(result)
      })
    }
  })

  describe('removeFirstNItemsFromSet', function () {
    let s: Set<number>
    this.beforeEach(() => {
      s = new Set([1, 2, 3, 4, 5])
    })

    const testCases: Array<{ id: string, ineed: number, result: Set<number> }> = [
      { id: 'remove first 0 item', ineed: 0, result: new Set([]) },
      { id: 'remove first 1 item', ineed: 1, result: new Set([1]) },
      { id: 'remove first 2 item', ineed: 2, result: new Set([1, 2]) },
      { id: 'remove first 10 item', ineed: 10, result: new Set([1, 2, 3, 4, 5]) }
    ]

    for (const { id, ineed, result } of testCases) {
      // eslint-disable-next-line no-loop-func
      it(id, () => {
        expect(removeFirstNItemsFromSet(s, ineed)).to.deep.equal(result)
      })
    }
  })
})
