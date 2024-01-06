/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { Queue, type QueueAddOptions } from './queue/index.js'
import type { Job } from './queue/job.js'
import type { PeerId } from '@libp2p/interface'

export interface PeerQueueOptions extends QueueAddOptions {
  peerId: PeerId
}

/**
 * Extends Queue to add support for querying queued jobs by peer id
 */
export class PeerQueue<JobReturnType = void> extends Queue<JobReturnType, PeerQueueOptions> {
  has (peerId: PeerId): boolean {
    return this.find(peerId) != null
  }

  find (peerId: PeerId): Job<PeerQueueOptions, JobReturnType> | undefined {
    return this.queue.find(job => {
      return peerId.equals(job.options.peerId)
    })
  }
}
