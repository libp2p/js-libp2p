import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import pDefer from 'p-defer'
import { Queue } from '../src/queue/index.js'

const fixture = Symbol('fixture')

function randomInt (minimum: number, maximum: number): number {
  return Math.floor(
    (Math.random() * (maximum - minimum + 1)) + minimum
  )
}

describe('queue', () => {
  it('adds', async () => {
    const queue = new Queue<symbol>({})
    const promise = queue.add(async () => fixture)

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)

    await expect(promise).to.eventually.equal(fixture)
  })

  it('adds with limited concurrency', async () => {
    const queue = new Queue<symbol>({ concurrency: 2 })
    const promise = queue.add(async () => fixture)
    const promise2 = queue.add(async () => {
      await delay(100)
      return fixture
    })
    const promise3 = queue.add(async () => fixture)
    expect(queue).to.have.property('size', 3)
    expect(queue).to.have.property('queued', 1)
    expect(queue).to.have.property('running', 2)

    await expect(promise).to.eventually.equal(fixture)
    await expect(promise2).to.eventually.equal(fixture)
    await expect(promise3).to.eventually.equal(fixture)
  })

  it('adds with concurrency 1', async () => {
    const concurrency = 1
    const queue = new Queue({ concurrency })
    queue.addEventListener('active', () => {
      expect(queue).to.have.property('running').that.is.lessThanOrEqual(concurrency)
    })
    queue.addEventListener('idle', () => {
      expect(queue).to.have.property('running').that.is.lessThanOrEqual(concurrency)
    })
    queue.addEventListener('next', () => {
      expect(queue).to.have.property('running').that.is.lessThanOrEqual(concurrency)
    })
    queue.addEventListener('completed', () => {
      expect(queue).to.have.property('running').that.is.lessThanOrEqual(concurrency)
    })

    for (let i = 0; i < 100; i++) {
      void queue.add(async () => {
        await delay(10)
      })
    }

    await queue.onIdle()
  })

  it('adds with concurrency 5', async () => {
    const concurrency = 5
    const queue = new Queue({ concurrency })
    queue.addEventListener('active', () => {
      expect(queue).to.have.property('running').that.is.lessThanOrEqual(concurrency)
    })
    queue.addEventListener('idle', () => {
      expect(queue).to.have.property('running').that.is.lessThanOrEqual(concurrency)
    })
    queue.addEventListener('next', () => {
      expect(queue).to.have.property('running').that.is.lessThanOrEqual(concurrency)
    })
    queue.addEventListener('completed', () => {
      expect(queue).to.have.property('running').that.is.lessThanOrEqual(concurrency)
    })

    for (let i = 0; i < 100; i++) {
      void queue.add(async () => {
        await delay(10)
      })
    }

    await queue.onIdle()
  })

  it('updates concurrency while adding', async () => {
    let concurrency = 5
    const queue = new Queue({ concurrency })
    let running = 0

    const input = Array.from({ length: 100 }).fill(0).map(async (_value, index) => queue.add(async () => {
      running++

      expect(running).to.be.lessThanOrEqual(concurrency)
      expect(queue).to.have.property('running').that.is.lessThanOrEqual(concurrency)

      await delay(randomInt(30, 200))
      running--

      if (index % 30 === 0) {
        queue.concurrency = --concurrency
        expect(queue.concurrency).to.equal(concurrency)
      }
    }))

    await Promise.all(input)
  })

  it('adds with priority', async () => {
    const result: number[] = []
    const queue = new Queue<number>({ concurrency: 1 })
    void queue.add(async () => result.push(1), { priority: 1 })
    void queue.add(async () => result.push(0), { priority: 0 })
    void queue.add(async () => result.push(1), { priority: 1 })
    void queue.add(async () => result.push(2), { priority: 1 })
    void queue.add(async () => result.push(3), { priority: 2 })
    void queue.add(async () => result.push(0), { priority: -1 })

    await queue.onEmpty()

    expect(result).to.deep.equal([1, 3, 1, 2, 0, 0])
  })

  it('.onEmpty()', async () => {
    const queue = new Queue<number>({ concurrency: 1 })

    void queue.add(async () => 0)
    void queue.add(async () => 0)

    expect(queue).to.have.property('size', 2)
    expect(queue).to.have.property('running', 1)
    expect(queue).to.have.property('running', 1)

    await queue.onEmpty()

    expect(queue).to.have.property('size', 0)

    void queue.add(async () => 0)
    void queue.add(async () => 0)

    expect(queue).to.have.property('size', 2)
    expect(queue).to.have.property('running', 1)
    expect(queue).to.have.property('running', 1)

    await queue.onEmpty()

    expect(queue).to.have.property('size', 0)

    // Test an empty queue
    await queue.onEmpty()

    expect(queue).to.have.property('size', 0)
  })

  it('.onIdle()', async () => {
    const queue = new Queue({ concurrency: 2 })

    void queue.add(async () => delay(100))
    void queue.add(async () => delay(100))
    void queue.add(async () => delay(100))

    expect(queue).to.have.property('size', 3)
    expect(queue).to.have.property('queued', 1)
    expect(queue).to.have.property('running', 2)

    await queue.onIdle()

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)

    void queue.add(async () => delay(100))
    void queue.add(async () => delay(100))
    void queue.add(async () => delay(100))

    expect(queue).to.have.property('size', 3)
    expect(queue).to.have.property('queued', 1)
    expect(queue).to.have.property('running', 2)

    await queue.onIdle()

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
  })

  it('.onSizeLessThan()', async () => {
    const queue = new Queue({ concurrency: 1 })

    void queue.add(async () => delay(100))
    void queue.add(async () => delay(100))
    void queue.add(async () => delay(100))
    void queue.add(async () => delay(100))
    void queue.add(async () => delay(100))

    await queue.onSizeLessThan(4)
    expect(queue).to.have.property('size', 3)
    expect(queue).to.have.property('queued', 2)
    expect(queue).to.have.property('running', 1)

    await queue.onSizeLessThan(2)

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)

    await queue.onSizeLessThan(10)

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)

    await queue.onSizeLessThan(1)

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)
  })

  it('.onIdle() - no pending', async () => {
    const queue = new Queue()

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)

    await queue.onIdle()
  })

  it('.clear()', async () => {
    const queue = new Queue({ concurrency: 2 })
    void queue.add(async () => delay(20_000))
    void queue.add(async () => delay(20_000))
    void queue.add(async () => delay(20_000))
    void queue.add(async () => delay(20_000))
    void queue.add(async () => delay(20_000))
    void queue.add(async () => delay(20_000))

    expect(queue).to.have.property('size', 6)
    expect(queue).to.have.property('queued', 4)
    expect(queue).to.have.property('running', 2)

    queue.clear()

    expect(queue).to.have.property('size', 0)
  })

  it('.add() - handle task throwing error', async () => {
    const queue = new Queue<string>({ concurrency: 1 })

    void queue.add(async () => 'sync 1')
    void queue.add(async () => {
      throw new Error('broken')
    }).catch(err => {
      expect(err).to.have.property('message', 'broken')
    })
    void queue.add(async () => 'sync 2')

    expect(queue).to.have.property('size', 3)
    expect(queue).to.have.property('queued', 2)
    expect(queue).to.have.property('running', 1)

    await queue.onIdle()
  })

  it('should emit active event per item', async () => {
    const items = [0, 1, 2, 3, 4]
    const queue = new Queue<number>()

    let eventCount = 0
    queue.addEventListener('active', () => {
      eventCount++
    })

    for (const item of items) {
      void queue.add(async () => item)
    }

    await queue.onIdle()

    expect(eventCount).to.equal(items.length)
  })

  it('should emit idle event when idle', async () => {
    const queue = new Queue({ concurrency: 1 })

    let timesCalled = 0
    queue.addEventListener('idle', () => {
      timesCalled++
    })

    const job1 = queue.add(async () => delay(100))
    const job2 = queue.add(async () => delay(100))

    expect(queue).to.have.property('size', 2)
    expect(queue).to.have.property('queued', 1)
    expect(queue).to.have.property('running', 1)
    expect(timesCalled).to.equal(0)

    await job1

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)
    expect(timesCalled).to.equal(0)

    await job2

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)
    expect(timesCalled).to.equal(1)

    const job3 = queue.add(async () => delay(100))

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)

    expect(timesCalled).to.equal(1)

    await job3

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)

    expect(timesCalled).to.equal(2)
  })

  it('should emit empty event when empty', async () => {
    const queue = new Queue({ concurrency: 1 })

    let timesCalled = 0
    queue.addEventListener('empty', () => {
      timesCalled++
    })

    const { resolve: resolveJob1, promise: job1Promise } = pDefer()
    const { resolve: resolveJob2, promise: job2Promise } = pDefer()

    const job1 = queue.add(async () => job1Promise)
    const job2 = queue.add(async () => job2Promise)

    expect(queue).to.have.property('size', 2)
    expect(queue).to.have.property('queued', 1)
    expect(queue).to.have.property('running', 1)
    expect(timesCalled).to.equal(0)

    resolveJob1()
    await job1

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)
    expect(timesCalled).to.equal(0)

    resolveJob2()
    await job2

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)
    expect(timesCalled).to.equal(1)
  })

  it('should emit add event when adding task', async () => {
    const queue = new Queue({ concurrency: 1 })

    let timesCalled = 0
    queue.addEventListener('add', () => {
      timesCalled++
    })

    const job1 = queue.add(async () => delay(100))

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)
    expect(timesCalled).to.equal(1)

    const job2 = queue.add(async () => delay(100))

    expect(queue).to.have.property('size', 2)
    expect(queue).to.have.property('queued', 1)
    expect(queue).to.have.property('running', 1)
    expect(timesCalled).to.equal(2)

    await job1

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)
    expect(timesCalled).to.equal(2)

    await job2

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)
    expect(timesCalled).to.equal(2)

    const job3 = queue.add(async () => delay(100))

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)
    expect(timesCalled).to.equal(3)

    await job3

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)
    expect(timesCalled).to.equal(3)
  })

  it('should emit next event when completing task', async () => {
    const queue = new Queue({ concurrency: 1 })

    let timesCalled = 0
    queue.addEventListener('next', () => {
      timesCalled++
    })

    const job1 = queue.add(async () => delay(100))

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)
    expect(timesCalled).to.equal(0)

    const job2 = queue.add(async () => delay(100))

    expect(queue).to.have.property('size', 2)
    expect(queue).to.have.property('queued', 1)
    expect(queue).to.have.property('running', 1)
    expect(timesCalled).to.equal(0)

    await job1

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)
    expect(timesCalled).to.equal(1)

    await job2

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)
    expect(timesCalled).to.equal(2)

    const job3 = queue.add(async () => delay(100))

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)
    expect(timesCalled).to.equal(2)

    await job3

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)
    expect(timesCalled).to.equal(3)
  })

  it('should emit completed / error events', async () => {
    const queue = new Queue({ concurrency: 1 })

    let errorEvents = 0
    let completedEvents = 0
    queue.addEventListener('error', () => {
      errorEvents++
    })
    queue.addEventListener('completed', () => {
      completedEvents++
    })

    const job1 = queue.add(async () => delay(100))

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)
    expect(errorEvents).to.equal(0)
    expect(completedEvents).to.equal(0)

    const job2 = queue.add(async () => {
      await delay(1)
      throw new Error('failure')
    })

    expect(queue).to.have.property('size', 2)
    expect(queue).to.have.property('queued', 1)
    expect(queue).to.have.property('running', 1)
    expect(errorEvents).to.equal(0)
    expect(completedEvents).to.equal(0)

    await job1

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)
    expect(errorEvents).to.equal(0)
    expect(completedEvents).to.equal(1)

    await expect(job2).to.eventually.be.rejected()

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)
    expect(errorEvents).to.equal(1)
    expect(completedEvents).to.equal(1)

    const job3 = queue.add(async () => delay(100))

    expect(queue).to.have.property('size', 1)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 1)
    expect(errorEvents).to.equal(1)
    expect(completedEvents).to.equal(1)

    await job3

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)
    expect(errorEvents).to.equal(1)
    expect(completedEvents).to.equal(2)
  })

  it('should skip an aborted job', async () => {
    const queue = new Queue()
    const controller = new AbortController()
    controller.abort()

    await expect(queue.add(async () => {}, {
      signal: controller.signal
    })).to.eventually.be.rejected()
  })

  it('should abort a job', async () => {
    const queue = new Queue()
    const controller = new AbortController()

    await expect(queue.add(async () => {
      await delay(10)
      controller.abort()
      controller.signal.throwIfAborted()
    }, {
      signal: controller.signal
    })).to.eventually.be.rejected()
  })

  it('should pass AbortSignal instance to job', async () => {
    const queue = new Queue()

    await queue.add(async (options) => {
      expect(options).to.have.property('signal')
    })
  })

  it('aborting multiple jobs at the same time', async () => {
    const queue = new Queue({ concurrency: 1 })

    const controller1 = new AbortController()
    const controller2 = new AbortController()

    const task1 = queue.add(async () => new Promise(() => {}), {
      signal: controller1.signal
    })
    const task2 = queue.add(async () => new Promise(() => {}), {
      signal: controller2.signal
    })

    setTimeout(() => {
      controller1.abort()
      controller2.abort()
    }, 0)

    await Promise.all([
      expect(task1).to.eventually.be.rejected(),
      expect(task2).to.eventually.be.rejected()
    ])

    expect(queue).to.have.property('size', 0)
    expect(queue).to.have.property('queued', 0)
    expect(queue).to.have.property('running', 0)
  })

  it('should abort jobs', async () => {
    const abortSignalFired = pDefer()
    const jobWasRejected = pDefer()
    const queue = new Queue({ concurrency: 1 })
    queue.add(async (options) => {
      options?.signal?.addEventListener('abort', () => {
        abortSignalFired.resolve()
      })

      await delay(100)
    }).catch((err) => {
      jobWasRejected.resolve(err)
    })

    queue.abort()

    await Promise.all([
      abortSignalFired.promise,
      jobWasRejected.promise
    ])
  })

  it('can be used as a generator', async () => {
    const results = [0, 1, 2, 3, 4]
    const queue = new Queue<number>({ concurrency: 1 })

    for (let i = 0; i < results.length; i++) {
      void queue.add(async () => {
        await delay(10)
        return results[i]
      })
    }

    await expect(all(queue.toGenerator())).to.eventually.deep.equal(results)
  })

  it('can abort a generator', async () => {
    const controller = new AbortController()
    const results = [0, 1, 2, 3, 4]
    const queue = new Queue<number>({ concurrency: 1 })

    for (let i = 0; i < results.length; i++) {
      void queue.add(async () => {
        await delay(100)
        return results[i]
      })
        .catch(() => {})
    }

    setTimeout(() => {
      controller.abort()
    })

    await expect(all(queue.toGenerator({
      signal: controller.signal
    }))).to.eventually.be.rejected
      .with.property('code', 'ERR_QUEUE_ABORTED')
  })

  it('can break out of a loop with a generator', async () => {
    const results = [0, 1, 2, 3, 4]
    const queue = new Queue<number>({ concurrency: 1 })
    let started = 0
    const collected: number[] = []

    for (let i = 0; i < results.length; i++) {
      // eslint-disable-next-line no-loop-func
      void queue.add(async () => {
        started++
        await delay(100)
        return results[i]
      })
        .catch(() => {})
    }

    for await (const result of queue.toGenerator()) {
      collected.push(result)

      if (result === 1) {
        break
      }
    }

    expect(started).to.equal(3)
    expect(collected).to.deep.equal([0, 1])
    expect(queue.size).to.equal(0)
  })
})
