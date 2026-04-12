import { AbortError } from '@libp2p/interface'
import pDefer from 'p-defer'
import type { AbortOptions } from '@libp2p/interface'
import type { DeferredPromise } from 'p-defer'
import type { ProgressOptions, ProgressEventListener } from 'progress-events'

export class JobRecipient<JobReturnType, JobOptions extends AbortOptions & ProgressOptions = any> {
  public deferred: DeferredPromise<JobReturnType>
  public signal?: AbortSignal
  public onProgress?: ProgressEventListener

  constructor (options?: Partial<Pick<JobOptions, 'signal' | 'onProgress'>>) {
    this.signal = options?.signal
    this.onProgress = options?.onProgress
    this.deferred = pDefer()

    this.onAbort = this.onAbort.bind(this)
    this.signal?.addEventListener('abort', this.onAbort)
  }

  onAbort (): void {
    this.deferred.reject(this.signal?.reason ?? new AbortError())
  }

  cleanup (): void {
    this.signal?.removeEventListener('abort', this.onAbort)
  }
}
