/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { CodeError, ERR_INVALID_PARAMETERS } from '@libp2p/interface'
import { PeerMap } from '@libp2p/peer-collections'
import pDefer from 'p-defer'
import PQueue from 'p-queue'
import type { PeerId } from '@libp2p/interface'
import type { AbortOptions } from 'it-pushable'
import type { DeferredPromise } from 'p-defer'
import type { QueueAddOptions, Options, Queue } from 'p-queue'

// Port of lower_bound from https://en.cppreference.com/w/cpp/algorithm/lower_bound
// Used to compute insertion index to keep queue sorted after insertion
function lowerBound<T> (array: readonly T[], value: T, comparator: (a: T, b: T) => number): number {
  let first = 0
  let count = array.length

  while (count > 0) {
    const step = Math.trunc(count / 2)
    let it = first + step

    if (comparator(array[it]!, value) <= 0) {
      first = ++it
      count -= step + 1
    } else {
      count = step
    }
  }

  return first
}

interface RunFunction<T> {
  (options?: AbortOptions): Promise<T>
}

export interface PeerPriorityQueueOptions extends QueueAddOptions {
  peerId: PeerId
}

interface PeerJob {
  priority: number
  peerId: PeerId
  run: RunFunction<any>
}

/**
 * Port of https://github.com/sindresorhus/p-queue/blob/main/source/priority-queue.ts
 * that adds support for filtering jobs by peer id
 */
class PeerPriorityQueue implements Queue<RunFunction<unknown>, PeerPriorityQueueOptions> {
  readonly #queue: PeerJob[] = []

  enqueue (run: RunFunction<unknown>, options?: Partial<PeerPriorityQueueOptions>): void {
    const peerId = options?.peerId
    const priority = options?.priority ?? 0

    if (peerId == null) {
      throw new CodeError('missing peer id', ERR_INVALID_PARAMETERS)
    }

    const element: PeerJob = {
      priority,
      peerId,
      run
    }

    if (this.size > 0 && this.#queue[this.size - 1]!.priority >= priority) {
      this.#queue.push(element)
      return
    }

    const index = lowerBound(
      this.#queue, element,
      (a: Readonly<PeerPriorityQueueOptions>, b: Readonly<PeerPriorityQueueOptions>) => b.priority! - a.priority!
    )
    this.#queue.splice(index, 0, element)
  }

  dequeue (): RunFunction<unknown> | undefined {
    const item = this.#queue.shift()
    return item?.run
  }

  filter (options: Readonly<Partial<PeerPriorityQueueOptions>>): Array<RunFunction<unknown>> {
    if (options.peerId != null) {
      const peerId = options.peerId

      return this.#queue.filter(
        (element: Readonly<PeerPriorityQueueOptions>) => peerId.equals(element.peerId)
      ).map((element: Readonly<{ run: RunFunction<unknown> }>) => element.run)
    }

    return this.#queue.filter(
      (element: Readonly<PeerPriorityQueueOptions>) => element.priority === options.priority
    ).map((element: Readonly<{ run: RunFunction<unknown> }>) => element.run)
  }

  get size (): number {
    return this.#queue.length
  }
}

/**
 * Extends PQueue to add support for querying queued jobs by peer id
 */
export class PeerJobQueue extends PQueue<PeerPriorityQueue, PeerPriorityQueueOptions> {
  private readonly results: PeerMap<DeferredPromise<any> | true>

  constructor (options: Options<PeerPriorityQueue, PeerPriorityQueueOptions> = {}) {
    super({
      ...options,
      queueClass: PeerPriorityQueue
    })

    this.results = new PeerMap()
  }

  /**
   * Returns true if this queue has a job for the passed peer id that has not
   * yet started to run
   */
  hasJob (peerId: PeerId): boolean {
    return this.sizeBy({
      peerId
    }) > 0
  }

  /**
   * Returns a promise for the result of the job in the queue for the passed
   * peer id.
   */
  async joinJob <Result = void> (peerId: PeerId): Promise<Result> {
    let deferred = this.results.get(peerId)

    if (deferred == null) {
      throw new CodeError('No job found for peer id', 'ERR_NO_JOB_FOR_PEER_ID')
    }

    if (deferred === true) {
      // a job has been added but so far nothing has tried to join the job
      deferred = pDefer<Result>()
      this.results.set(peerId, deferred)
    }

    return deferred.promise
  }

  async add <T> (fn: RunFunction<T>, opts: PeerPriorityQueueOptions): Promise<T> {
    const peerId = opts?.peerId

    if (peerId == null) {
      throw new CodeError('missing peer id', ERR_INVALID_PARAMETERS)
    }

    this.results.set(opts.peerId, true)

    return super.add(async (opts?: AbortOptions) => {
      try {
        const value = await fn(opts)

        const deferred = this.results.get(peerId)

        if (deferred != null && deferred !== true) {
          deferred.resolve(value)
        }

        return value
      } catch (err) {
        const deferred = this.results.get(peerId)

        if (deferred != null && deferred !== true) {
          deferred.reject(err)
        }

        throw err
      } finally {
        this.results.delete(peerId)
      }
    }, opts) as Promise<T>
  }

  clear (): void {
    this.results.clear()
    super.clear()
  }
}
