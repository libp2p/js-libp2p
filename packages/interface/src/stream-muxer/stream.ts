// import { logger } from '@libp2p/logger'
import { abortableSource } from 'abortable-iterator'
import { anySignal } from 'any-signal'
import { type Pushable, pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import { CodeError } from '../errors.js'
import type { Direction, Stream, StreamStat } from '../connection/index.js'
import type { Source } from 'it-stream-types'

// const log = logger('libp2p:stream')

const log: any = () => {}
log.trace = () => {}
log.error = () => {}

const ERR_STREAM_RESET = 'ERR_STREAM_RESET'
const ERR_STREAM_ABORT = 'ERR_STREAM_ABORT'
const ERR_SINK_ENDED = 'ERR_SINK_ENDED'
const ERR_DOUBLE_SINK = 'ERR_DOUBLE_SINK'

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

export abstract class AbstractStream implements Stream {
  public id: string
  public stat: StreamStat
  public metadata: Record<string, unknown>
  public source: AsyncGenerator<Uint8ArrayList, void, unknown>

  private readonly abortController: AbortController
  private readonly resetController: AbortController
  private readonly closeController: AbortController
  private sourceEnded: boolean
  private sinkEnded: boolean
  private sinkSunk: boolean
  private endErr: Error | undefined
  private readonly streamSource: Pushable<Uint8ArrayList>
  private readonly onEnd?: (err?: Error | undefined) => void
  private readonly maxDataSize: number

  constructor (init: AbstractStreamInit) {
    this.abortController = new AbortController()
    this.resetController = new AbortController()
    this.closeController = new AbortController()
    this.sourceEnded = false
    this.sinkEnded = false
    this.sinkSunk = false

    this.id = init.id
    this.metadata = init.metadata ?? {}
    this.stat = {
      direction: init.direction,
      timeline: {
        open: Date.now()
      }
    }
    this.maxDataSize = init.maxDataSize
    this.onEnd = init.onEnd

    this.source = this.streamSource = pushable<Uint8ArrayList>({
      onEnd: () => {
        // already sent a reset message
        if (this.stat.timeline.reset !== null) {
          const res = this.sendCloseRead()

          if (isPromise(res)) {
            res.catch(err => {
              log.error('error while sending close read', err)
            })
          }
        }

        this.onSourceEnd()
      }
    })

    // necessary because the libp2p upgrader wraps the sink function
    this.sink = this.sink.bind(this)
  }

  protected onSourceEnd (err?: Error): void {
    if (this.sourceEnded) {
      return
    }

    this.stat.timeline.closeRead = Date.now()
    this.sourceEnded = true
    log.trace('%s stream %s source end - err: %o', this.stat.direction, this.id, err)

    if (err != null && this.endErr == null) {
      this.endErr = err
    }

    if (this.sinkEnded) {
      this.stat.timeline.close = Date.now()

      if (this.onEnd != null) {
        this.onEnd(this.endErr)
      }
    }
  }

  protected onSinkEnd (err?: Error): void {
    if (this.sinkEnded) {
      return
    }

    this.stat.timeline.closeWrite = Date.now()
    this.sinkEnded = true
    log.trace('%s stream %s sink end - err: %o', this.stat.direction, this.id, err)

    if (err != null && this.endErr == null) {
      this.endErr = err
    }

    if (this.sourceEnded) {
      this.stat.timeline.close = Date.now()

      if (this.onEnd != null) {
        this.onEnd(this.endErr)
      }
    }
  }

  // Close for both Reading and Writing
  close (): void {
    log.trace('%s stream %s close', this.stat.direction, this.id)

    this.closeRead()
    this.closeWrite()
  }

  // Close for reading
  closeRead (): void {
    log.trace('%s stream %s closeRead', this.stat.direction, this.id)

    if (this.sourceEnded) {
      return
    }

    this.streamSource.end()
  }

  // Close for writing
  closeWrite (): void {
    log.trace('%s stream %s closeWrite', this.stat.direction, this.id)

    if (this.sinkEnded) {
      return
    }

    this.closeController.abort()

    try {
      // need to call this here as the sink method returns in the catch block
      // when the close controller is aborted
      const res = this.sendCloseWrite()

      if (isPromise(res)) {
        res.catch(err => {
          log.error('error while sending close write', err)
        })
      }
    } catch (err) {
      log.trace('%s stream %s error sending close', this.stat.direction, this.id, err)
    }

    this.onSinkEnd()
  }

  // Close for reading and writing (local error)
  abort (err: Error): void {
    log.trace('%s stream %s abort', this.stat.direction, this.id, err)
    // End the source with the passed error
    this.streamSource.end(err)
    this.abortController.abort()
    this.onSinkEnd(err)
  }

  // Close immediately for reading and writing (remote error)
  reset (): void {
    const err = new CodeError('stream reset', ERR_STREAM_RESET)
    this.resetController.abort()
    this.streamSource.end(err)
    this.onSinkEnd(err)
  }

  async sink (source: Source<Uint8ArrayList | Uint8Array>): Promise<void> {
    if (this.sinkSunk) {
      throw new CodeError('sink already called on stream', ERR_DOUBLE_SINK)
    }

    this.sinkSunk = true

    if (this.sinkEnded) {
      throw new CodeError('stream closed for writing', ERR_SINK_ENDED)
    }

    const signal = anySignal([
      this.abortController.signal,
      this.resetController.signal,
      this.closeController.signal
    ])

    try {
      source = abortableSource(source, signal)

      if (this.stat.direction === 'outbound') { // If initiator, open a new stream
        const res = this.sendNewStream()

        if (isPromise(res)) {
          await res
        }
      }

      for await (let data of source) {
        while (data.length > 0) {
          if (data.length <= this.maxDataSize) {
            const res = this.sendData(data instanceof Uint8Array ? new Uint8ArrayList(data) : data)

            if (isPromise(res)) { // eslint-disable-line max-depth
              await res
            }

            break
          }
          data = data instanceof Uint8Array ? new Uint8ArrayList(data) : data
          const res = this.sendData(data.sublist(0, this.maxDataSize))

          if (isPromise(res)) {
            await res
          }

          data.consume(this.maxDataSize)
        }
      }
    } catch (err: any) {
      if (err.type === 'aborted' && err.message === 'The operation was aborted') {
        if (this.closeController.signal.aborted) {
          return
        }

        if (this.resetController.signal.aborted) {
          err.message = 'stream reset'
          err.code = ERR_STREAM_RESET
        }

        if (this.abortController.signal.aborted) {
          err.message = 'stream aborted'
          err.code = ERR_STREAM_ABORT
        }
      }

      // Send no more data if this stream was remotely reset
      if (err.code === ERR_STREAM_RESET) {
        log.trace('%s stream %s reset', this.stat.direction, this.id)
      } else {
        log.trace('%s stream %s error', this.stat.direction, this.id, err)
        try {
          const res = this.sendReset()

          if (isPromise(res)) {
            await res
          }

          this.stat.timeline.reset = Date.now()
        } catch (err) {
          log.trace('%s stream %s error sending reset', this.stat.direction, this.id, err)
        }
      }

      this.streamSource.end(err)
      this.onSinkEnd(err)

      throw err
    } finally {
      signal.clear()
    }

    try {
      const res = this.sendCloseWrite()

      if (isPromise(res)) {
        await res
      }
    } catch (err) {
      log.trace('%s stream %s error sending close', this.stat.direction, this.id, err)
    }

    this.onSinkEnd()
  }

  /**
   * When an extending class reads data from it's implementation-specific source,
   * call this method to allow the stream consumer to read the data.
   */
  sourcePush (data: Uint8ArrayList): void {
    this.streamSource.push(data)
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
