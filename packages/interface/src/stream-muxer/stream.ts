import { type Pushable, pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import { CodeError } from '../errors.js'
import type { Direction, RawStream, StreamTimeline } from '../connection/index.js'
import type { AbortOptions } from '@multiformats/multiaddr'

export interface AbstractStreamInit {
  /**
   * A unique identifier for this stream
   */
  id: string

  /**
   * The stream direction
   */
  direction: Direction

  /**
   * The maximum allowable data size, any data larger than this will be
   * chunked and sent in multiple data messages
   */
  maxDataSize: number

  /**
   * User specific stream metadata
   */
  metadata?: Record<string, unknown>

  /**
   * Invoked when the stream ends
   */
  onEnd?: (err?: Error | undefined) => void
}

function isPromise (res?: any): res is Promise<void> {
  return res != null && typeof res.then === 'function'
}

export abstract class AbstractStream implements RawStream {
  public id: string
  public direction: Direction
  public timeline: StreamTimeline
  public protocol?: string
  public metadata: Record<string, unknown>
  public readable: ReadableStream<Uint8Array>
  public writable: WritableStream<Uint8Array | Uint8ArrayList>

  private endErr: Error | undefined
  private readonly onEnd?: (err?: Error | undefined) => void
  private readonly maxDataSize: number
  private readonly streamSource: Pushable<Uint8Array>

  private readableStreamController?: ReadableStreamDefaultController
  private writableStreamController?: WritableStreamDefaultController

  constructor (init: AbstractStreamInit) {
    this.id = init.id
    this.metadata = init.metadata ?? {}
    this.direction = init.direction
    this.timeline = {
      open: Date.now()
    }
    this.maxDataSize = init.maxDataSize
    this.onEnd = init.onEnd
    let started = false
    this.streamSource = pushable()

    this.readable = new ReadableStream({
      start: (controller) => {
        this.readableStreamController = controller
      },
      pull: async (controller) => {
        if (this.direction === 'outbound' && !started) { // If initiator, open a new stream
          started = true

          try {
            const res = this.sendNewStream()

            if (isPromise(res)) {
              await res
            }
          } catch (err: any) {
            controller.error(err)
            this.onReadableEnd(err)
            return
          }
        }

        try {
          const { done, value } = await this.streamSource.next()

          if (done === true) {
            this.onReadableEnd()
            controller.close()
            return
          }

          controller.enqueue(value)
        } catch (err: any) {
          controller.error(err)
          this.onReadableEnd(err)
        }
      },
      cancel: async (err?: Error) => {
        // already sent a reset message
        if (this.timeline.reset !== null) {
          await this.sendCloseRead()
        }

        this.onReadableEnd(err)
      }
    })
    this.writable = new WritableStream({
      start: (controller) => {
        this.writableStreamController = controller
      },
      write: async (chunk, controller) => {
        if (this.direction === 'outbound' && !started) { // If initiator, open a new stream
          started = true

          try {
            const res = this.sendNewStream()

            if (isPromise(res)) {
              await res
            }
          } catch (err: any) {
            controller.error(err)
            this.onWritableEnd(err)
            return
          }
        }

        try {
          if (chunk.byteLength <= this.maxDataSize) {
            const res = this.sendData(chunk instanceof Uint8Array ? new Uint8ArrayList(chunk) : chunk)

            if (isPromise(res)) { // eslint-disable-line max-depth
              await res
            }

            return
          }

          // split chunk into multiple messages
          while (chunk.byteLength > 0) {
            chunk = chunk instanceof Uint8Array ? new Uint8ArrayList(chunk) : chunk

            let end = chunk.byteLength

            if (chunk.byteLength > this.maxDataSize) {
              end = this.maxDataSize
            }

            const res = this.sendData(chunk.sublist(0, end))

            if (isPromise(res)) {
              await res
            }

            chunk.consume(this.maxDataSize)
          }
        } catch (err: any) {
          controller.error(err)
          this.onWritableEnd(err)
        }
      },
      close: async () => {
        await this.sendCloseWrite()

        this.onWritableEnd()
      },
      abort: async (err: Error) => {
        await this.sendReset()

        this.onWritableEnd(err)
      }
    })
  }

  protected onReadableEnd (err?: Error): void {
    if (this.timeline.closeRead != null) {
      return
    }

    this.timeline.closeRead = Date.now()

    if (err != null && this.endErr == null) {
      this.endErr = err
    }

    if (this.timeline.closeWrite != null) {
      this.timeline.close = Date.now()

      if (this.onEnd != null) {
        this.onEnd(this.endErr)
      }
    }
  }

  protected onWritableEnd (err?: Error): void {
    if (this.timeline.closeWrite != null) {
      return
    }

    this.timeline.closeWrite = Date.now()

    if (err != null && this.endErr == null) {
      this.endErr = err
    }

    if (this.timeline.closeRead != null) {
      this.timeline.close = Date.now()

      if (this.onEnd != null) {
        this.onEnd(this.endErr)
      }
    }
  }

  /**
   * Close gracefully for both Reading and Writing
   */
  async close (options: AbortOptions = {}): Promise<void> {
    this.closeRead()
    await this.closeWrite()
  }

  /**
   * Gracefully close for reading
   */
  closeRead (): void {
    if (this.timeline.closeRead != null) {
      return
    }

    this.streamSource.end()
  }

  /**
   * Gracefully close for reading
   */
  async closeWrite (): Promise<void> {
    if (this.writable.locked) {
      this.writableStreamController?.error()
      this.onWritableEnd()
    } else {
      await this.writable.close()
    }
  }

  /**
   * Immediately close for reading and writing (local error)
   **/
  abort (err: Error): void {
    // End the source with the passed error
    this.streamSource.end(err)

    // drop any pending data and close streams
    this.readableStreamController?.error(err)
    this.onReadableEnd(err)
    this.writableStreamController?.error(err)
    this.onWritableEnd(err)

    const res = this.sendReset()

    if (isPromise(res)) {
      void res.catch(() => {})
    }
  }

  /**
   * Immediately close for reading and writing (remote error)
   **/
  reset (): void {
    const err = new CodeError('stream reset', 'ERR_STREAM_RESET')

    // End the source with the passed error
    this.streamSource.end(err)

    // drop any pending data and close streams
    this.readableStreamController?.error()
    this.onReadableEnd()
    this.writableStreamController?.error()
    this.onWritableEnd()
  }

  /**
   * When an extending class reads data from it's implementation-specific source,
   * call this method to allow the stream consumer to read the data.
   */
  sourcePush (data: Uint8ArrayList | Uint8Array): void {
    if (data instanceof Uint8Array) {
      this.streamSource.push(data)
      return
    }

    for (const buf of data) {
      this.streamSource.push(buf)
    }
  }

  /**
   * Returns the amount of unread data - can be used to prevent large amounts of
   * data building up when the stream consumer is too slow.
   */
  sourceReadableLength (): number {
    return this.streamSource.readableLength
  }

  /**
   * Send a message to the remote muxer informing them a new stream is being
   * opened
   */
  abstract sendNewStream (): void | Promise<void>

  /**
   * Send a data message to the remote muxer
   */
  abstract sendData (buf: Uint8ArrayList): void | Promise<void>

  /**
   * Send a reset message to the remote muxer
   */
  abstract sendReset (): void | Promise<void>

  /**
   * Send a message to the remote muxer, informing them no more data messages
   * will be sent by this end of the stream
   */
  abstract sendCloseWrite (): void | Promise<void>

  /**
   * Send a message to the remote muxer, informing them no more data messages
   * will be read by this end of the stream
   */
  abstract sendCloseRead (): void | Promise<void>
}
