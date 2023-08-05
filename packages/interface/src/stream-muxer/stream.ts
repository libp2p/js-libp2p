import { abortableSource } from 'abortable-iterator'
import { type Pushable, pushable } from 'it-pushable'
import defer, { type DeferredPromise } from 'p-defer'
import { Uint8ArrayList } from 'uint8arraylist'
import { CodeError } from '../errors.js'
import type { Direction, ReadStatus, Stream, StreamStatus, StreamTimeline, WriteStatus } from '../connection/index.js'
import type { AbortOptions } from '../index.js'
import type { Source } from 'it-stream-types'

interface Logger {
  (formatter: any, ...args: any[]): void
  error: (formatter: any, ...args: any[]) => void
  trace: (formatter: any, ...args: any[]) => void
  enabled: boolean
}

const ERR_STREAM_RESET = 'ERR_STREAM_RESET'
const ERR_SINK_INVALID_STATE = 'ERR_SINK_INVALID_STATE'

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
   * A Logger implementation used to log stream-specific information
   */
  log: Logger

  /**
   * User specific stream metadata
   */
  metadata?: Record<string, unknown>

  /**
   * Invoked when the stream ends
   */
  onEnd?: (err?: Error | undefined) => void

  /**
   * Invoked when the readable end of the stream is closed
   */
  onCloseRead?: () => void

  /**
   * Invoked when the writable end of the stream is closed
   */
  onCloseWrite?: () => void

  /**
   * Invoked when the the stream has been reset by the remote
   */
  onReset?: () => void

  /**
   * Invoked when the the stream has errored
   */
  onAbort?: (err: Error) => void

  /**
   * How long to wait in ms for stream data to be written to the underlying
   * connection when closing the writable end of the stream. (default: 500)
   */
  closeTimeout?: number
}

function isPromise (res?: any): res is Promise<void> {
  return res != null && typeof res.then === 'function'
}

export abstract class AbstractStream implements Stream {
  public id: string
  public direction: Direction
  public timeline: StreamTimeline
  public protocol?: string
  public metadata: Record<string, unknown>
  public source: AsyncGenerator<Uint8ArrayList, void, unknown>
  public status: StreamStatus
  public readStatus: ReadStatus
  public writeStatus: WriteStatus

  private readonly sinkController: AbortController
  private readonly sinkEnd: DeferredPromise<void>
  private endErr: Error | undefined
  private readonly streamSource: Pushable<Uint8ArrayList>
  private readonly onEnd?: (err?: Error | undefined) => void
  private readonly onCloseRead?: () => void
  private readonly onCloseWrite?: () => void
  private readonly onReset?: () => void
  private readonly onAbort?: (err: Error) => void

  protected readonly log: Logger

  constructor (init: AbstractStreamInit) {
    this.sinkController = new AbortController()
    this.sinkEnd = defer()
    this.log = init.log

    // stream status
    this.status = 'open'
    this.readStatus = 'ready'
    this.writeStatus = 'ready'

    this.id = init.id
    this.metadata = init.metadata ?? {}
    this.direction = init.direction
    this.timeline = {
      open: Date.now()
    }

    this.onEnd = init.onEnd
    this.onCloseRead = init?.onCloseRead
    this.onCloseWrite = init?.onCloseWrite
    this.onReset = init?.onReset
    this.onAbort = init?.onAbort

    this.source = this.streamSource = pushable<Uint8ArrayList>({
      onEnd: (err) => {
        if (err != null) {
          this.log.trace('source ended with error', err)
        } else {
          this.log.trace('source ended')
        }

        this.readStatus = 'closed'
        this.onSourceEnd(err)
      }
    })

    // necessary because the libp2p upgrader wraps the sink function
    this.sink = this.sink.bind(this)
  }

  async sink (source: Source<Uint8ArrayList | Uint8Array>): Promise<void> {
    if (this.writeStatus !== 'ready') {
      throw new CodeError(`writable end state is "${this.writeStatus}" not "ready"`, ERR_SINK_INVALID_STATE)
    }

    try {
      this.writeStatus = 'writing'

      const options: AbortOptions = {
        signal: this.sinkController.signal
      }

      if (this.direction === 'outbound') { // If initiator, open a new stream
        const res = this.sendNewStream(options)

        if (isPromise(res)) {
          await res
        }
      }

      source = abortableSource(source, this.sinkController.signal, {
        returnOnAbort: true
      })

      this.log.trace('sink reading from source')

      for await (let data of source) {
        data = data instanceof Uint8Array ? new Uint8ArrayList(data) : data

        const res = this.sendData(data, options)

        if (isPromise(res)) { // eslint-disable-line max-depth
          await res
        }
      }

      this.log.trace('sink finished reading from source')
      this.writeStatus = 'done'

      this.log.trace('sink calling closeWrite')
      await this.closeWrite(options)
      this.onSinkEnd()
    } catch (err: any) {
      this.log.trace('sink ended with error, calling abort with error', err)
      this.abort(err)

      throw err
    } finally {
      this.log.trace('resolve sink end')
      this.sinkEnd.resolve()
    }
  }

  protected onSourceEnd (err?: Error): void {
    if (this.timeline.closeRead != null) {
      return
    }

    this.timeline.closeRead = Date.now()

    if (err != null && this.endErr == null) {
      this.endErr = err
    }

    this.onCloseRead?.()

    if (this.timeline.closeWrite != null) {
      this.log.trace('source and sink ended')
      this.timeline.close = Date.now()

      if (this.onEnd != null) {
        this.onEnd(this.endErr)
      }
    } else {
      this.log.trace('source ended, waiting for sink to end')
    }
  }

  protected onSinkEnd (err?: Error): void {
    if (this.timeline.closeWrite != null) {
      return
    }

    this.timeline.closeWrite = Date.now()

    if (err != null && this.endErr == null) {
      this.endErr = err
    }

    this.onCloseWrite?.()

    if (this.timeline.closeRead != null) {
      this.log.trace('sink and source ended')
      this.timeline.close = Date.now()

      if (this.onEnd != null) {
        this.onEnd(this.endErr)
      }
    } else {
      this.log.trace('sink ended, waiting for source to end')
    }
  }

  // Close for both Reading and Writing
  async close (options?: AbortOptions): Promise<void> {
    this.log.trace('closing gracefully')

    this.status = 'closing'

    await Promise.all([
      this.closeRead(options),
      this.closeWrite(options)
    ])

    this.status = 'closed'

    this.log.trace('closed gracefully')
  }

  async closeRead (options: AbortOptions = {}): Promise<void> {
    if (this.readStatus === 'closing' || this.readStatus === 'closed') {
      return
    }

    this.log.trace('closing readable end of stream with starting read status "%s"', this.readStatus)

    const readStatus = this.readStatus
    this.readStatus = 'closing'

    if (readStatus === 'ready') {
      this.log.trace('ending internal source queue')
      this.streamSource.end()
    }

    if (this.status !== 'reset' && this.status !== 'aborted' && this.timeline.closeRead == null) {
      this.log.trace('send close read to remote')
      await this.sendCloseRead(options)
    }

    this.log.trace('closed readable end of stream')
  }

  async closeWrite (options: AbortOptions = {}): Promise<void> {
    if (this.writeStatus === 'closing' || this.writeStatus === 'closed') {
      return
    }

    this.log.trace('closing writable end of stream with starting write status "%s"', this.writeStatus)

    const writeStatus = this.writeStatus

    if (this.writeStatus === 'ready') {
      this.log.trace('sink was never sunk, sink an empty array')
      await this.sink([])
    }

    this.writeStatus = 'closing'

    if (writeStatus === 'writing') {
      // stop reading from the source passed to `.sink` in the microtask queue
      // - this lets any data queued by the user in the current tick get read
      // before we exit
      await new Promise((resolve, reject) => {
        queueMicrotask(() => {
          this.log.trace('aborting source passed to .sink')
          this.sinkController.abort()
          this.sinkEnd.promise.then(resolve, reject)
        })
      })
    }

    if (this.status !== 'reset' && this.status !== 'aborted' && this.timeline.closeWrite == null) {
      this.log.trace('send close write to remote')
      await this.sendCloseWrite(options)
    }

    this.writeStatus = 'closed'

    this.log.trace('closed writable end of stream')
  }

  /**
   * Close immediately for reading and writing and send a reset message (local
   * error)
   */
  abort (err: Error): void {
    if (this.status === 'closed' || this.status === 'aborted' || this.status === 'reset') {
      return
    }

    this.log('abort with error', err)

    // try to send a reset message
    this.log('try to send reset to remote')
    const res = this.sendReset()

    if (isPromise(res)) {
      res.catch((err) => {
        this.log.error('error sending reset message', err)
      })
    }

    this.status = 'aborted'
    this.timeline.abort = Date.now()
    this._closeSinkAndSource(err)
    this.onAbort?.(err)
  }

  /**
   * Receive a reset message - close immediately for reading and writing (remote
   * error)
   */
  reset (): void {
    if (this.status === 'closed' || this.status === 'aborted' || this.status === 'reset') {
      return
    }

    const err = new CodeError('stream reset', ERR_STREAM_RESET)

    this.status = 'reset'
    this._closeSinkAndSource(err)
    this.onReset?.()
  }

  _closeSinkAndSource (err?: Error): void {
    this._closeSink(err)
    this._closeSource(err)
  }

  _closeSink (err?: Error): void {
    // if the sink function is running, cause it to end
    if (this.writeStatus === 'writing') {
      this.log.trace('end sink source')
      this.sinkController.abort()
    }

    this.onSinkEnd(err)
  }

  _closeSource (err?: Error): void {
    // if the source is not ending, end it
    if (this.readStatus !== 'closing' && this.readStatus !== 'closed') {
      this.log.trace('ending source with %d bytes to be read by consumer', this.streamSource.readableLength)
      this.readStatus = 'closing'
      this.streamSource.end(err)
    }
  }

  /**
   * The remote closed for writing so we should expect to receive no more
   * messages
   */
  remoteCloseWrite (): void {
    if (this.readStatus === 'closing' || this.readStatus === 'closed') {
      this.log('received remote close write but local source is already closed')
      return
    }

    this.log.trace('remote close write')
    this._closeSource()
  }

  /**
   * The remote closed for reading so we should not send any more
   * messages
   */
  remoteCloseRead (): void {
    if (this.writeStatus === 'closing' || this.writeStatus === 'closed') {
      this.log('received remote close read but local sink is already closed')
      return
    }

    this.log.trace('remote close read')
    this._closeSink()
  }

  /**
   * The underlying muxer has closed, no more messages can be sent or will
   * be received, close immediately to free up resources
   */
  destroy (): void {
    if (this.status === 'closed' || this.status === 'aborted' || this.status === 'reset') {
      this.log('received destroy but we are already closed')
      return
    }

    this.log.trace('muxer destroyed')

    this._closeSinkAndSource()
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
  abstract sendNewStream (options?: AbortOptions): void | Promise<void>

  /**
   * Send a data message to the remote muxer
   */
  abstract sendData (buf: Uint8ArrayList, options?: AbortOptions): void | Promise<void>

  /**
   * Send a reset message to the remote muxer
   */
  abstract sendReset (options?: AbortOptions): void | Promise<void>

  /**
   * Send a message to the remote muxer, informing them no more data messages
   * will be sent by this end of the stream
   */
  abstract sendCloseWrite (options?: AbortOptions): void | Promise<void>

  /**
   * Send a message to the remote muxer, informing them no more data messages
   * will be read by this end of the stream
   */
  abstract sendCloseRead (options?: AbortOptions): void | Promise<void>
}
