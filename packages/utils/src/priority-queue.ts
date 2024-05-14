import { Queue } from './queue/index.js'
import type { QueueInit } from './queue/index.js'
import type { AbortOptions } from '@libp2p/interface'

export interface PriorityQueueJobOptions extends AbortOptions {
  priority: number
}

export class PriorityQueue <JobReturnType = void, JobOptions extends PriorityQueueJobOptions = PriorityQueueJobOptions> extends Queue<JobReturnType, JobOptions> {
  constructor (init: QueueInit<JobReturnType, JobOptions> = {}) {
    super({
      ...init,
      sort: (a, b) => {
        if (a.options.priority > b.options.priority) {
          return -1
        }

        if (a.options.priority < b.options.priority) {
          return 1
        }

        return 0
      }
    })
  }
}
