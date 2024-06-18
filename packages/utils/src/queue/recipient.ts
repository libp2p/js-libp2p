import { AbortError } from '@libp2p/interface'
import pDefer from 'p-defer'
import type { DeferredPromise } from 'p-defer'

export class JobRecipient<JobReturnType> {
  public deferred: DeferredPromise<JobReturnType>
  public signal?: AbortSignal

  constructor (signal?: AbortSignal) {
    this.signal = signal
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
