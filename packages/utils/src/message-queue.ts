import { StreamMessageEvent } from '@libp2p/interface'
import delay from 'delay'
import { TypedEventEmitter } from 'main-event'
import { raceSignal } from 'race-signal'
import { isUint8ArrayList, Uint8ArrayList } from 'uint8arraylist'
import { Queue } from './queue/index.js'
import type { AbortOptions, Logger } from '@libp2p/interface'

const DEFAULT_CHUNK_SIZE = 1024 * 64

export interface MessageQueueEvents {
  /**
   * Message data
   */
  message: StreamMessageEvent

  /**
   * Emitted when the queue is empty
   */
  drain: Event

  /**
   * The remote closed the connection abruptly
   */
  reset: Event
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

  /**
   * Data messages larger than this size will be chunked into smaller messages.
   *
   * Defaults to the maximum TCP package size.
   *
   * @default 65_536
   */
  chunkSize?: number
}

interface MessageQueueJobOptions extends AbortOptions {
  evt: Event
}

/**
 * Accepts events to emit after a short delay, and with a configurable maximum
 * queue capacity after which the send method will return false to let us
 * simulate write backpressure.
 */
export class MessageQueue<Events> extends TypedEventEmitter<Events & MessageQueueEvents> {
  public needsDrain: boolean

  private queue: Queue<void, MessageQueueJobOptions>
  private capacity: number
  private delay: number
  private log: Logger
  private chunkSize: number

  constructor (init: MessageQueueInit & { log: Logger }) {
    super()

    this.needsDrain = false
    this.queue = new Queue({
      concurrency: 1
    })
    this.capacity = init.capacity ?? 5
    this.delay = init.delay ?? 0
    this.log = init.log
    this.chunkSize = init.chunkSize ?? DEFAULT_CHUNK_SIZE

    this.queue.addEventListener('idle', () => {
      if (this.needsDrain) {
        this.log('network send queue drained')
        this.needsDrain = false
        this.safeDispatchEvent('drain')
      } else {
        this.log('network send queue idle')
      }
    })
  }

  send (evt: Event): boolean {
    if (isMessageEvent(evt)) {
      // chunk outgoing messages to match TCP packet sizes
      const data = new Uint8ArrayList(evt.data)

      while (data.byteLength > 0) {
        const end = Math.min(this.chunkSize, data.byteLength)
        const chunk = data.sublist(0, end)
        data.consume(chunk.byteLength)

        const chunkEvent = new StreamMessageEvent(chunk)

        this.queue.add(async (opts) => {
          if (this.delay > 0) {
            await raceSignal(delay(this.delay), opts.signal)
          }

          this.dispatchEvent(opts.evt)
        }, {
          evt: chunkEvent
        })
      }
    } else {
      this.queue.add(async (opts) => {
        if (this.delay > 0) {
          await raceSignal(delay(this.delay), opts.signal)
        }

        this.dispatchEvent(opts.evt)
      }, {
        evt
      })
    }

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

function isMessageEvent (evt?: any): evt is StreamMessageEvent {
  return evt?.data instanceof Uint8Array || isUint8ArrayList(evt?.data)
}
