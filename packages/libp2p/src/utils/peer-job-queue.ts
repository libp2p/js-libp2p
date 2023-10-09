/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { CodeError, codes } from '@libp2p/interface/errors'
import PQueue from 'p-queue'
import type { PeerId } from '@libp2p/interface/peer-id'
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

interface RunFunction { (): Promise<unknown> }

export interface PeerPriorityQueueOptions extends QueueAddOptions {
  peerId: PeerId
}

interface PeerJob {
  priority: number
  peerId: PeerId
  run: RunFunction
}

/**
 * Port of https://github.com/sindresorhus/p-queue/blob/main/source/priority-queue.ts
 * that adds support for filtering jobs by peer id
 */
class PeerPriorityQueue implements Queue<RunFunction, PeerPriorityQueueOptions> {
  readonly #queue: PeerJob[] = []

  enqueue (run: RunFunction, options?: Partial<PeerPriorityQueueOptions>): void {
    const peerId = options?.peerId
    const priority = options?.priority ?? 0

    if (peerId == null) {
      throw new CodeError('missing peer id', codes.ERR_INVALID_PARAMETERS)
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

  dequeue (): RunFunction | undefined {
    const item = this.#queue.shift()
    return item?.run
  }

  filter (options: Readonly<Partial<PeerPriorityQueueOptions>>): RunFunction[] {
    if (options.peerId != null) {
      const peerId = options.peerId

      return this.#queue.filter(
        (element: Readonly<PeerPriorityQueueOptions>) => peerId.equals(element.peerId)
      ).map((element: Readonly<{ run: RunFunction }>) => element.run)
    }

    return this.#queue.filter(
      (element: Readonly<PeerPriorityQueueOptions>) => element.priority === options.priority
    ).map((element: Readonly<{ run: RunFunction }>) => element.run)
  }

  get size (): number {
    return this.#queue.length
  }
}

/**
 * Extends PQueue to add support for querying queued jobs by peer id
 */
export class PeerJobQueue extends PQueue<PeerPriorityQueue, PeerPriorityQueueOptions> {
  constructor (options: Options<PeerPriorityQueue, PeerPriorityQueueOptions> = {}) {
    super({
      ...options,
      queueClass: PeerPriorityQueue
    })
  }

  /**
   * Returns true if this queue has a job for the passed peer id that has not yet
   * started to run
   */
  hasJob (peerId: PeerId): boolean {
    return this.sizeBy({
      peerId
    }) > 0
  }
}
