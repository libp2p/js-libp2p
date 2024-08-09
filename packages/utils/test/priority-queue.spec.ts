import { expect } from 'aegir/chai'
import { PriorityQueue } from '../src/priority-queue.js'

describe('priority-queue', () => {
  it('adds with priority', async () => {
    const result: number[] = []
    const queue = new PriorityQueue<number>({ concurrency: 1 })
    void queue.add(async () => result.push(1), { priority: 1 })
    void queue.add(async () => result.push(0), { priority: 0 })
    void queue.add(async () => result.push(1), { priority: 1 })
    void queue.add(async () => result.push(2), { priority: 1 })
    void queue.add(async () => result.push(3), { priority: 2 })
    void queue.add(async () => result.push(0), { priority: -1 })

    await queue.onEmpty()

    expect(result).to.deep.equal([1, 3, 1, 2, 0, 0])
  })
})
