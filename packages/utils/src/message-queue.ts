import delay from 'delay'
import { TypedEventEmitter } from 'main-event'
import { Queue } from './queue/index.js'
import type { Logger } from '@libp2p/interface'

export interface MessageQueueMessages {
  /**
   * Emitted when the queue is empty
   */
  drain: Event
}

export interface MessageQueueInit {
  /**
   * How much delay there should be between each message send in ms (note that
   * even 0 introduces a small delay)
   *
   * @default 0
   */
  delay?: number

  /**
   * How many messages to hold in the send queue before applying backpressure to
   * the sender
   */
  capacity?: number
}

/**
 * Accepts events to emit after a short delay, and with a configurable maximum
 * queue capacity after which the send method will return false to let us
 * simulate write backpressure.
 */
export class MessageQueue<Messages> extends TypedEventEmitter<Messages & MessageQueueMessages> {
  private queue: Queue
  private capacity: number
  private delay: number
  private needsDrain: boolean
  private log: Logger

  constructor (init: MessageQueueInit & { log: Logger }) {
    super()

    this.needsDrain = false
    this.queue = new Queue({
      concurrency: 1
    })
    this.capacity = init.capacity ?? 5
    this.delay = init.delay ?? 0
    this.log = init.log

    this.queue.addEventListener('idle', () => {
      if (this.needsDrain) {
        this.log('network send queue drained')
        this.safeDispatchEvent('drain')
        this.needsDrain = false
      }
    })
  }

  send (evt: Event): boolean {
    this.queue.add(async () => {
      if (this.delay > 0) {
        await delay(this.delay)
      }

      this.dispatchEvent(evt)
    })

    if (this.queue.size >= this.capacity) {
      this.log('network send queue full')
      this.needsDrain = true
      return false
    }

    return true
  }

  pause (): void {
    this.queue.pause()
  }

  resume (): void {
    this.queue.resume()
  }

  onIdle (): Promise<void> {
    return this.queue.onIdle()
  }

  size (): number {
    return this.queue.size
  }
}
