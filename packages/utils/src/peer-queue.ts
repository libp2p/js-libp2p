import { Queue } from './queue/index.ts'
import type { Job } from './queue/job.ts'
import type { AbortOptions, PeerId } from '@libp2p/interface'

export interface PeerQueueJobOptions extends AbortOptions {
  peerId: PeerId
}

/**
 * Extends Queue to add support for querying queued jobs by peer id
 */
export class PeerQueue<JobReturnType = void, JobOptions extends PeerQueueJobOptions = PeerQueueJobOptions> extends Queue<JobReturnType, JobOptions> {
  has (peerId: PeerId): boolean {
    return this.find(peerId) != null
  }

  find (peerId: PeerId): Job<JobOptions, JobReturnType> | undefined {
    return this.queue.find(job => {
      return peerId.equals(job.options.peerId)
    })
  }
}
