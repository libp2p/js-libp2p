import { AbortError } from '@libp2p/interface'
import { setMaxListeners } from 'main-event'
import { raceSignal } from 'race-signal'
import { JobRecipient } from './recipient.js'
import type { JobStatus } from './index.js'
import type { AbortOptions } from '@libp2p/interface'

/**
 * Returns a random string
 */
function randomId (): string {
  return `${(parseInt(String(Math.random() * 1e9), 10)).toString()}${Date.now()}`
}

export interface JobTimeline {
  created: number
  started?: number
  finished?: number
}

export class Job <JobOptions extends AbortOptions = AbortOptions, JobReturnType = unknown> {
  public id: string
  public fn: (options: JobOptions) => Promise<JobReturnType>
  public options: JobOptions
  public recipients: Array<JobRecipient<JobReturnType>>
  public status: JobStatus
  public readonly timeline: JobTimeline
  private readonly controller: AbortController

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

  async join (options: AbortOptions = {}): Promise<JobReturnType> {
    const recipient = new JobRecipient<JobReturnType>(options.signal)
    this.recipients.push(recipient)

    options.signal?.addEventListener('abort', this.onAbort)

    return recipient.deferred.promise
  }

  async run (): Promise<void> {
    this.status = 'running'
    this.timeline.started = Date.now()

    try {
      this.controller.signal.throwIfAborted()

      const result = await raceSignal(this.fn({
        ...(this.options ?? {}),
        signal: this.controller.signal
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
      recipient.cleanup()
      recipient.signal?.removeEventListener('abort', this.onAbort)
    })
  }
}
