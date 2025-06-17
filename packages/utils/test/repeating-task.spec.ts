import { expect } from 'aegir/chai'
import delay from 'delay'
import pDefer from 'p-defer'
import { repeatingTask } from '../src/repeating-task.js'
import type { RepeatingTask } from '../src/repeating-task.js'

describe('repeating-task', () => {
  let task: RepeatingTask

  afterEach(() => {
    task?.stop()
  })

  it('should repeat a task', async () => {
    let count = 0

    task = repeatingTask(() => {
      count++
    }, 100)
    task.start()

    await delay(1000)

    task.stop()

    expect(count).to.be.greaterThan(1)
  })

  it('should run a task immediately', async () => {
    let count = 0

    task = repeatingTask(() => {
      count++
    }, 60000, {
      runImmediately: true
    })
    task.start()

    await delay(10)

    expect(count).to.equal(1)
  })

  it('should time out a task', async () => {
    const deferred = pDefer()

    task = repeatingTask((opts) => {
      opts?.signal?.addEventListener('abort', () => {
        deferred.resolve()
      })
    }, 100, {
      timeout: 10
    })
    task.start()

    await deferred.promise
  })

  it('should repeat a task that throws', async () => {
    let count = 0

    task = repeatingTask(() => {
      count++
      throw new Error('Urk!')
    }, 100)
    task.start()

    await delay(1000)

    expect(count).to.be.greaterThan(1)
  })

  it('should update the interval of a task', async () => {
    let count = 0

    task = repeatingTask(() => {
      count++

      if (count === 1) {
        task.setInterval(2000)
      }
    }, 100)
    task.start()

    await delay(1000)

    expect(count).to.equal(1)
  })

  it('should update the timeout of a task', async () => {
    let count = 0

    task = repeatingTask(async (options) => {
      // simulate a delay
      await delay(100)

      if (options?.signal?.aborted !== true) {
        count++
      }

      if (count === 1) {
        // set the task timeout to less than our simulated delay
        task.setTimeout(10)
      }
    }, 100, {
      timeout: 500
    })
    task.start()

    await delay(1000)

    expect(count).to.equal(1)
  })

  it('should not reschedule the task if the interval is updated to the same value', async () => {
    let count = 0

    task = repeatingTask(() => {
      count++
    }, 1_000, {
      runImmediately: true
    })
    task.start()

    await delay(100)

    task.setInterval(200)

    await delay(100)

    task.setInterval(200)

    await delay(100)

    expect(count).to.equal(2)
  })

  it('should allow interrupting the timeout to run the task immediately', async () => {
    let count = 0

    task = repeatingTask(() => {
      count++
    }, 1_000)
    task.start()

    // run immediately
    task.run()

    // less than the repeat interval
    await delay(200)

    expect(count).to.equal(1)
  })

  it('should debounce interrupting the timeout to run the task immediately', async () => {
    let count = 0

    task = repeatingTask(() => {
      count++
    }, 1_000, {
      debounce: 10
    })
    task.start()

    // run immediately
    task.run()
    task.run()
    task.run()
    task.run()
    task.run()

    // less than the repeat interval
    await delay(50)

    expect(count).to.equal(1)
  })

  it('should schedule re-running the task after interrupting the timeout', async () => {
    let count = 0

    task = repeatingTask(() => {
      count++
    }, 100, {
      debounce: 10
    })
    task.start()

    // run immediately
    task.run()

    // less than the repeat interval
    await delay(50)

    expect(count).to.equal(1)

    // wait longer than the repeat interval
    await delay(150)

    expect(count).to.equal(2)
  })
})
