import { AbortError, CodeError, TypedEventEmitter } from '@libp2p/interface'
import { pushable } from 'it-pushable'
import { raceEvent } from 'race-event'
import { Job } from './job.js'
import type { AbortOptions, Metrics } from '@libp2p/interface'

export interface QueueAddOptions extends AbortOptions {
  /**
   * Priority of operation. Operations with greater priority will be scheduled first.
   *
   * @default 0
   */
  priority?: number
}

export interface QueueInit {
  /**
   * Concurrency limit.
   *
   * Minimum: `1`.
   *
   * @default Infinity
   */
  concurrency?: number

  /**
   * The name of the metric for the queue length
   */
  metricName?: string

  /**
   * An implementation of the libp2p Metrics interface
   */
  metrics?: Metrics
}

export type JobStatus = 'queued' | 'running' | 'errored' | 'complete'

export interface RunFunction<Options = AbortOptions, ReturnType = void> {
  (opts?: Options): Promise<ReturnType>
}

export interface JobMatcher<JobOptions extends QueueAddOptions = QueueAddOptions> {
  (options?: Partial<JobOptions>): boolean
}

export interface QueueJobSuccess<JobReturnType, JobOptions extends QueueAddOptions = QueueAddOptions> {
  job: Job<JobOptions, JobReturnType>
  result: JobReturnType
}

export interface QueueJobFailure<JobReturnType, JobOptions extends QueueAddOptions = QueueAddOptions> {
  job: Job<JobOptions, JobReturnType>
  error: Error
}

export interface QueueEvents<JobReturnType, JobOptions extends QueueAddOptions = QueueAddOptions> {
  /**
   * A job is about to start running
   */
  'active': CustomEvent

  /**
   * All jobs have finished and the queue is empty
   */
  'idle': CustomEvent

  /**
   * The queue is empty, jobs may be running
   */
  'empty': CustomEvent

  /**
   * A job was added to the queue
   */
  'add': CustomEvent

  /**
   * A job has finished or failed
   */
  'next': CustomEvent

  /**
   * A job has finished successfully
   */
  'completed': CustomEvent<JobReturnType>

  /**
   * A job has failed
   */
  'error': CustomEvent<Error>

  /**
   * Emitted just after `"completed", a job has finished successfully - this
   * event gives access to the job and it's result
   */
  'success': CustomEvent<QueueJobSuccess<JobReturnType, JobOptions>>

  /**
   * Emitted just after `"error", a job has failed - this event gives access to
   * the job and the thrown error
   */
  'failure': CustomEvent<QueueJobFailure<JobReturnType, JobOptions>>
}

// Port of lower_bound from https://en.cppreference.com/w/cpp/algorithm/lower_bound
// Used to compute insertion index to keep queue sorted after insertion
function lowerBound<T> (array: readonly T[], value: T, comparator: (a: T, b: T) => number): number {
  let first = 0
  let count = array.length

  while (count > 0) {
    const step = Math.trunc(count / 2)
    let it = first + step

    if (comparator(array[it], value) <= 0) {
      first = ++it
      count -= step + 1
    } else {
      count = step
    }
  }

  return first
}

/**
 * Heavily influence by `p-queue` with the following differences:
 *
 * 1. Items remain at the head of the queue while they are running so `queue.size` includes `queue.pending` items - this is so interested parties can join the results of a queue item while it is running
 * 2. The options for a job are stored separately to the job in order for them to be modified while they are still in the queue
 */
export class Queue<JobReturnType = unknown, JobOptions extends QueueAddOptions = QueueAddOptions> extends TypedEventEmitter<QueueEvents<JobReturnType, JobOptions>> {
  public concurrency: number
  public queue: Array<Job<JobOptions, JobReturnType>>
  private pending: number

  constructor (init: QueueInit = {}) {
    super()

    this.concurrency = init.concurrency ?? Number.POSITIVE_INFINITY
    this.pending = 0

    if (init.metricName != null) {
      init.metrics?.registerMetricGroup(init.metricName, {
        calculate: () => {
          return {
            size: this.queue.length,
            running: this.pending,
            queued: this.queue.length - this.pending
          }
        }
      })
    }

    this.queue = []
  }

  private tryToStartAnother (): boolean {
    if (this.size === 0) {
      // do this in the microtask queue so all job recipients receive the
      // result before the "empty" event fires
      queueMicrotask(() => {
        this.safeDispatchEvent('empty')
      })

      if (this.running === 0) {
        // do this in the microtask queue so all job recipients receive the
        // result before the "idle" event fires
        queueMicrotask(() => {
          this.safeDispatchEvent('idle')
        })
      }

      return false
    }

    if (this.pending < this.concurrency) {
      let job: Job<JobOptions, JobReturnType> | undefined

      for (const j of this.queue) {
        if (j.status === 'queued') {
          job = j
          break
        }
      }

      if (job == null) {
        return false
      }

      this.safeDispatchEvent('active')

      this.pending++

      job.run()
        .finally(() => {
          // remove the job from the queue
          for (let i = 0; i < this.queue.length; i++) {
            if (this.queue[i] === job) {
              this.queue.splice(i, 1)
              break
            }
          }

          this.pending--
          this.tryToStartAnother()
          this.safeDispatchEvent('next')
        })

      return true
    }

    return false
  }

  private enqueue (job: Job<JobOptions, JobReturnType>): void {
    if (this.queue[this.size - 1]?.priority >= job.priority) {
      this.queue.push(job)
      return
    }

    const index = lowerBound(
      this.queue, job,
      (a: Readonly< Job<JobOptions, JobReturnType>>, b: Readonly< Job<JobOptions, JobReturnType>>) => b.priority - a.priority
    )
    this.queue.splice(index, 0, job)
  }

  /**
   * Adds a sync or async task to the queue. Always returns a promise.
   */
  async add (fn: RunFunction<JobOptions, JobReturnType>, options?: JobOptions): Promise<JobReturnType> {
    options?.signal?.throwIfAborted()

    const job = new Job<JobOptions, JobReturnType>(fn, options, options?.priority)

    const p = job.join(options)
      .then(result => {
        this.safeDispatchEvent('completed', { detail: result })
        this.safeDispatchEvent('success', { detail: { job, result } })

        return result
      })
      .catch(err => {
        if (job.status === 'queued') {
          // job was aborted before it started - remove the job from the queue
          for (let i = 0; i < this.queue.length; i++) {
            if (this.queue[i] === job) {
              this.queue.splice(i, 1)
              break
            }
          }
        }

        this.safeDispatchEvent('error', { detail: err })
        this.safeDispatchEvent('failure', { detail: { job, error: err } })

        throw err
      })

    this.enqueue(job)
    this.safeDispatchEvent('add')
    this.tryToStartAnother()

    return p
  }

  /**
   * Clear the queue
   */
  clear (): void {
    this.queue.splice(0, this.queue.length)
  }

  /**
   * Abort all jobs in the queue and clear it
   */
  abort (): void {
    this.queue.forEach(job => {
      job.abort(new AbortError())
    })

    this.clear()
  }

  /**
   * Can be called multiple times. Useful if you for example add additional items at a later time.
   *
   * @returns A promise that settles when the queue becomes empty.
   */
  async onEmpty (options?: AbortOptions): Promise<void> {
    // Instantly resolve if the queue is empty
    if (this.size === 0) {
      return
    }

    await raceEvent(this, 'empty', options?.signal)
  }

  /**
   * @returns A promise that settles when the queue size is less than the given
   * limit: `queue.size < limit`.
   *
   * If you want to avoid having the queue grow beyond a certain size you can
   * `await queue.onSizeLessThan()` before adding a new item.
   *
   * Note that this only limits the number of items waiting to start. There
   * could still be up to `concurrency` jobs already running that this call does
   * not include in its calculation.
   */
  async onSizeLessThan (limit: number, options?: AbortOptions): Promise<void> {
    // Instantly resolve if the queue is empty.
    if (this.size < limit) {
      return
    }

    await raceEvent(this, 'next', options?.signal, {
      filter: () => this.size < limit
    })
  }

  /**
   * The difference with `.onEmpty` is that `.onIdle` guarantees that all work
   * from the queue has finished. `.onEmpty` merely signals that the queue is
   * empty, but it could mean that some promises haven't completed yet.
   *
   * @returns A promise that settles when the queue becomes empty, and all
   * promises have completed; `queue.size === 0 && queue.pending === 0`.
   */
  async onIdle (options?: AbortOptions): Promise<void> {
    // Instantly resolve if none pending and if nothing else is queued
    if (this.pending === 0 && this.size === 0) {
      return
    }

    await raceEvent(this, 'idle', options?.signal)
  }

  /**
   * Size of the queue including running items
   */
  get size (): number {
    return this.queue.length
  }

  /**
   * The number of queued items waiting to run.
   */
  get queued (): number {
    return this.queue.length - this.pending
  }

  /**
   * The number of items currently running.
   */
  get running (): number {
    return this.pending
  }

  /**
   * Returns an async generator that makes it easy to iterate over the results
   * of jobs added to the queue.
   *
   * The generator will end when the queue becomes idle, that is there are no
   * jobs running and no jobs that have yet to run.
   *
   * If you need to keep the queue open indefinitely, consider using it-pushable
   * instead.
   */
  async * toGenerator (options?: AbortOptions): AsyncGenerator<JobReturnType, void, unknown> {
    options?.signal?.throwIfAborted()

    const stream = pushable<JobReturnType>({
      objectMode: true
    })

    const cleanup = (err?: Error): void => {
      if (err != null) {
        this.abort()
      } else {
        this.clear()
      }

      stream.end(err)
    }

    const onQueueJobComplete = (evt: CustomEvent<JobReturnType>): void => {
      if (evt.detail != null) {
        stream.push(evt.detail)
      }
    }

    const onQueueError = (evt: CustomEvent<Error>): void => {
      cleanup(evt.detail)
    }

    const onQueueIdle = (): void => {
      cleanup()
    }

    // clear the queue and throw if the query is aborted
    const onSignalAbort = (): void => {
      cleanup(new CodeError('Queue aborted', 'ERR_QUEUE_ABORTED'))
    }

    // add listeners
    this.addEventListener('completed', onQueueJobComplete)
    this.addEventListener('error', onQueueError)
    this.addEventListener('idle', onQueueIdle)
    options?.signal?.addEventListener('abort', onSignalAbort)

    try {
      yield * stream
    } finally {
      // remove listeners
      this.removeEventListener('completed', onQueueJobComplete)
      this.removeEventListener('error', onQueueError)
      this.removeEventListener('idle', onQueueIdle)
      options?.signal?.removeEventListener('abort', onSignalAbort)

      // empty the queue for when the user has broken out of a loop early
      cleanup()
    }
  }
}
