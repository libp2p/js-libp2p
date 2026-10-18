import { AbortError } from '@libp2p/interface'
import { setMaxListeners } from 'main-event'
import { raceSignal } from 'race-signal'
import { JobRecipient } from './recipient.ts'
import type { JobStatus } from './index.ts'
import type { AbortOptions } from '@libp2p/interface'
import type { ProgressOptions } from 'progress-events'

/**
 * Returns a random string
 */
function randomId (): string {
  return `${(parseInt(String(Math.random() * 1e9), 10)).toString()}${Date.now()}`
}

// tracks which jobs have forwarded a given progress event - each job forwards
// an event object at most once, so recipient graphs with shared paths stay
// linear to dispatch. event objects must not be reused across emissions
const dispatchedProgressEvents = new WeakMap<object, WeakSet<object>>()

export interface JobTimeline {
  created: number
  started?: number
  finished?: number
}

export class Job <JobOptions extends AbortOptions & ProgressOptions = AbortOptions, JobReturnType = unknown> {
  public id: string
  public fn: (options: JobOptions) => Promise<JobReturnType>
  public options: JobOptions
  public recipients: Array<JobRecipient<JobReturnType>>
  public status: JobStatus
  public readonly timeline: JobTimeline
  private readonly controller: AbortController
  private dispatchingProgress: boolean

  constructor (fn: (options: JobOptions) => Promise<JobReturnType>, options: any) {
    this.id = randomId()
    this.status = 'queued'
    this.fn = fn
    this.options = options
    this.recipients = []
    this.timeline = {
      created: Date.now()
    }

    this.controller = new AbortController()
    setMaxListeners(Infinity, this.controller.signal)

    this.dispatchingProgress = false

    this.onAbort = this.onAbort.bind(this)
  }

  abort (err: Error): void {
    this.controller.abort(err)
  }

  onAbort (): void {
    const allAborted = this.recipients.reduce((acc, curr) => {
      return acc && (curr.signal?.aborted === true)
    }, true)

    // if all recipients have aborted the job, actually abort the job
    if (allAborted) {
      this.controller.abort(new AbortError())
      this.cleanup()
    }
  }

  async join (options?: Partial<Pick<JobOptions, 'signal' | 'onProgress'>>): Promise<JobReturnType> {
    const recipient = new JobRecipient<JobReturnType>(options)
    this.recipients.push(recipient)

    options?.signal?.addEventListener('abort', this.onAbort)

    return recipient.deferred.promise
  }

  async run (): Promise<void> {
    this.status = 'running'
    this.timeline.started = Date.now()

    try {
      this.controller.signal.throwIfAborted()

      const result = await raceSignal(this.fn({
        ...(this.options ?? {}),
        signal: this.controller.signal,
        onProgress: (evt: any): void => {
          if (this.recipients.length === 0) {
            return
          }

          // re-entry guard - without it a dispatch cycle recurses until the
          // stack overflows, even when a hop wraps the event in a new object
          if (this.dispatchingProgress) {
            return
          }

          if (typeof evt === 'object' && evt !== null) {
            let jobs = dispatchedProgressEvents.get(evt)

            if (jobs == null) {
              jobs = new WeakSet()
              dispatchedProgressEvents.set(evt, jobs)
            }

            if (jobs.has(this)) {
              return
            }

            jobs.add(this)
          }

          this.dispatchingProgress = true

          try {
            this.recipients.forEach(recipient => {
              recipient.onProgress?.(evt)
            })
          } finally {
            this.dispatchingProgress = false
          }
        }
      }), this.controller.signal)

      this.recipients.forEach(recipient => {
        recipient.deferred.resolve(result)
      })

      this.status = 'complete'
    } catch (err) {
      this.recipients.forEach(recipient => {
        recipient.deferred.reject(err)
      })

      this.status = 'errored'
    } finally {
      this.timeline.finished = Date.now()
      this.cleanup()
    }
  }

  cleanup (): void {
    this.recipients.forEach(recipient => {
      // no-op for recipients settled by run() or their own abort listener -
      // settles any whose abort listener was removed before it could fire
      recipient.deferred.reject(recipient.signal?.reason ?? new AbortError())
      recipient.cleanup()
      recipient.signal?.removeEventListener('abort', this.onAbort)
    })

    // stop forwarding progress events and release the recipients (and the
    // callbacks they hold) for garbage collection
    this.recipients.splice(0, this.recipients.length)
  }
}
