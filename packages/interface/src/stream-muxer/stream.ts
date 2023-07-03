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
// const ERR_CLOSE_READ_ABORTED = 'ERR_CLOSE_READ_ABORTED'
const CLOSE_TIMEOUT = 2000

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
   * connection when closing the writable end of the stream. (default: 2000)
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
  private readonly closeTimeout: number
  private streamDataSent: boolean

  protected readonly log: Logger

  constructor (init: AbstractStreamInit) {
    this.sinkController = new AbortController()
    this.sinkEnd = defer()
    // this.closeReadTimeout = init.closeReadTimeout ?? CLOSE_TIMEOUT
    this.closeTimeout = init.closeTimeout ?? CLOSE_TIMEOUT
    this.log = init.log

    // stream status
    this.status = 'open'
    this.readStatus = 'ready'
    this.writeStatus = 'ready'

    this.streamDataSent = false

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

      if (this.direction === 'outbound') { // If initiator, open a new stream
        const res = this.sendNewStream()

        if (isPromise(res)) {
          await res
        }
      }

      source = abortableSource(source, this.sinkController.signal, {
        returnOnAbort: true
      })

      this.log.trace('sink reading from source')

      for await (let data of source) {
        // if a protocol has been negotiated, and we receive subsequent data, it
        // is stream data and we should wait for the source to end before
        // considering the write end of this stream to be gracefully closed
        this.streamDataSent = this.protocol != null

        data = data instanceof Uint8Array ? new Uint8ArrayList(data) : data

        const res = this.sendData(data)

        if (isPromise(res)) { // eslint-disable-line max-depth
          await res
        }
      }

      this.log.trace('sink finished reading from source')
      this.writeStatus = 'done'

      this.log.trace('sink calling closeWrite')
      await this.closeWrite()
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

    if (this.status !== 'reset' && this.status !== 'aborted') {
      this.log.trace('send close read to remote')
      await this.sendCloseRead()
    }

    this.log.trace('closed readable end of stream')
  }

  /*
  private async _waitForConsumerToReadBytes (options: AbortOptions = {}): Promise<void> {
    this.log.trace('source has %d bytes to be read by consumer', this.streamSource.readableLength)

    if (this.streamSource.readableLength === 0) {
      return
    }

    // if the application has yet to read all the data, wait for it to do so or
    // for a timeout to be reached
    this.log.trace('wait for consumer to read bytes')

    // wait for data to be read from the stream
    const signal = options.signal ?? AbortSignal.timeout(this.closeReadTimeout)
    const sourceAbortPromise = new Promise<void>((resolve, reject) => {
      signal.addEventListener('abort', () => {
        this.log.trace('close read aborted')

        reject(new CodeError(`${this.direction} stream close read aborted`, ERR_CLOSE_READ_ABORTED))
      })
    })

    // either wait for all data to be read or the close timeout to be reached
    await Promise.race([
      this.streamSource.drain,
      sourceAbortPromise
    ])

    this.log.trace('source was read to completion by consumer')
  }
*/
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

    // if `.sink(source)` has been called, wait for the source to end or forcibly
    // end the iteration after a timeout
    if (writeStatus === 'writing') {
      if (this.streamDataSent) {
        // the application has sent stream data so wait for it to finish before
        // proceeding
        this.log.trace('stream data has been sent, waiting for the sink to end')

        const signal = options.signal ?? AbortSignal.timeout(this.closeTimeout)
        const listener = (): void => {
          this.log.trace('close write aborted')
          this.sinkController.abort()
        }
        signal.addEventListener('abort', listener)

        try {
          // either wait for the sink to end or the close timeout to be reached
          await this.sinkEnd.promise
        } finally {
          signal.removeEventListener('abort', listener)
        }

        this.log.trace('raced sink end against sink abort')
      } else {
        // we have negotiated a protocol, but no actual stream data has been sent
        // so just abort the sink
        this.log.trace('no stream data was sent, aborting sink')
        this.sinkController.abort()
        await this.sinkEnd.promise
      }
    }

    if (this.status !== 'reset' && this.status !== 'aborted') {
      this.log.trace('send close write to remote')
      await this.sendCloseWrite()
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
