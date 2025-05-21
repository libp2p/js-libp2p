import { expect } from 'aegir/chai'
import delay from 'delay'
import pDefer from 'p-defer'
import { repeatingTask } from '../src/repeating-task.js'

describe('repeating-task', () => {
  it('should repeat a task', async () => {
    let count = 0

    const task = repeatingTask(() => {
      count++
    }, 100)
    task.start()

    await delay(1000)

    task.stop()

    expect(count).to.be.greaterThan(1)
  })

  it('should run a task immediately', async () => {
    let count = 0

    const task = repeatingTask(() => {
      count++
    }, 60000, {
      runImmediately: true
    })
    task.start()

    await delay(10)

    task.stop()

    expect(count).to.equal(1)
  })

  it('should time out a task', async () => {
    const deferred = pDefer()

    const task = repeatingTask((opts) => {
      opts?.signal?.addEventListener('abort', () => {
        deferred.resolve()
      })
    }, 100, {
      timeout: 10
    })
    task.start()

    await deferred.promise
    task.stop()
  })

  it('should repeat a task that throws', async () => {
    let count = 0

    const task = repeatingTask(() => {
      count++
      throw new Error('Urk!')
    }, 100)
    task.start()

    await delay(1000)

    task.stop()

    expect(count).to.be.greaterThan(1)
  })

  it('should update the interval of a task', async () => {
    let count = 0

    const task = repeatingTask(() => {
      count++

      if (count === 1) {
        task.setInterval(2000)
      }
    }, 100)
    task.start()

    await delay(1000)

    task.stop()

    expect(count).to.equal(1)
  })

  it('should update the timeout of a task', async () => {
    let count = 0

    const task = repeatingTask(async (options) => {
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

    task.stop()

    expect(count).to.equal(1)
  })

  it('should not reschedule the task if the interval is updated to the same value', async () => {
    let count = 0

    const task = repeatingTask(() => {
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

    task.stop()

    expect(count).to.equal(2)
  })
})
