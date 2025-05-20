import { StreamResetError, StreamStateError } from '@libp2p/interface'
import { pushable } from 'it-pushable'
import defer from 'p-defer'
import { raceSignal } from 'race-signal'
import { Uint8ArrayList } from 'uint8arraylist'
import { closeSource } from './close-source.js'
import type { AbortOptions, Direction, ReadStatus, Stream, StreamStatus, StreamTimeline, WriteStatus } from '@libp2p/interface'
import type { Logger } from '@libp2p/logger'
import type { Pushable } from 'it-pushable'
import type { Source } from 'it-stream-types'
import type { DeferredPromise } from 'p-defer'

const DEFAULT_SEND_CLOSE_WRITE_TIMEOUT = 5000

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
  onEnd?(err?: Error): void

  /**
   * Invoked when the readable end of the stream is closed
   */
  onCloseRead?(): void

  /**
   * Invoked when the writable end of the stream is closed
   */
  onCloseWrite?(): void

  /**
   * Invoked when the stream has been reset by the remote
   */
  onReset?(): void

  /**
   * Invoked when the stream has errored
   */
  onAbort?(err: Error): void

  /**
   * How long to wait in ms for stream data to be written to the underlying
   * connection when closing the writable end of the stream.
   *
   * @default 500
   */
  closeTimeout?: number

  /**
   * After the stream sink has closed, a limit on how long it takes to send
   * a close-write message to the remote peer.
   */
  sendCloseWriteTimeout?: number
}

function isPromise <T = unknown> (thing: any): thing is Promise<T> {
  if (thing == null) {
    return false
  }

  return typeof thing.then === 'function' &&
    typeof thing.catch === 'function' &&
    typeof thing.finally === 'function'
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
  public readonly log: Logger

  private readonly sinkController: AbortController
  private readonly sinkEnd: DeferredPromise<void>
  private readonly closed: DeferredPromise<void>
  private endErr: Error | undefined
  private readonly streamSource: Pushable<Uint8ArrayList>
  private readonly onEnd?: (err?: Error) => void
  private readonly onCloseRead?: () => void
  private readonly onCloseWrite?: () => void
  private readonly onReset?: () => void
  private readonly onAbort?: (err: Error) => void
  private readonly sendCloseWriteTimeout: number
  private sendingData?: DeferredPromise<void>

  constructor (init: AbstractStreamInit) {
    this.sinkController = new AbortController()
    this.sinkEnd = defer()
    this.closed = defer()
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
    this.sendCloseWriteTimeout = init.sendCloseWriteTimeout ?? DEFAULT_SEND_CLOSE_WRITE_TIMEOUT

    this.onEnd = init.onEnd
    this.onCloseRead = init.onCloseRead
    this.onCloseWrite = init.onCloseWrite
    this.onReset = init.onReset
    this.onAbort = init.onAbort

    this.source = this.streamSource = pushable<Uint8ArrayList>({
      onEnd: (err) => {
        if (err != null) {
          this.log.trace('source ended with error', err)
        } else {
          this.log.trace('source ended')
        }

        this.onSourceEnd(err)
      }
    })

    // necessary because the libp2p upgrader wraps the sink function
    this.sink = this.sink.bind(this)
  }

  async sink (source: Source<Uint8ArrayList | Uint8Array>): Promise<void> {
    if (this.writeStatus !== 'ready') {
      throw new StreamStateError(`writable end state is "${this.writeStatus}" not "ready"`)
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

      const abortListener = (): void => {
        closeSource(source, this.log)
      }

      try {
        this.sinkController.signal.addEventListener('abort', abortListener)

        this.log.trace('sink reading from source')

        for await (let data of source) {
          data = data instanceof Uint8Array ? new Uint8ArrayList(data) : data

          const res = this.sendData(data, options)

          if (isPromise(res)) {
            this.sendingData = defer()
            await res
            this.sendingData.resolve()
            this.sendingData = undefined
          }
        }
      } finally {
        this.sinkController.signal.removeEventListener('abort', abortListener)
      }

      this.log.trace('sink finished reading from source, write status is "%s"', this.writeStatus)

      if (this.writeStatus === 'writing') {
        this.writeStatus = 'closing'

        this.log.trace('send close write to remote')
        await this.sendCloseWrite({
          signal: AbortSignal.timeout(this.sendCloseWriteTimeout)
        })

        this.writeStatus = 'closed'
      }

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
    this.readStatus = 'closed'

    if (err != null && this.endErr == null) {
      this.endErr = err
    }

    this.onCloseRead?.()

    if (this.timeline.closeWrite != null) {
      this.log.trace('source and sink ended')
      this.timeline.close = Date.now()

      if (this.status !== 'aborted' && this.status !== 'reset') {
        this.status = 'closed'
      }

      if (this.onEnd != null) {
        this.onEnd(this.endErr)
      }

      this.closed.resolve()
    } else {
      this.log.trace('source ended, waiting for sink to end')
    }
  }

  protected onSinkEnd (err?: Error): void {
    if (this.timeline.closeWrite != null) {
      return
    }

    this.timeline.closeWrite = Date.now()
    this.writeStatus = 'closed'

    if (err != null && this.endErr == null) {
      this.endErr = err
    }

    this.onCloseWrite?.()

    if (this.timeline.closeRead != null) {
      this.log.trace('sink and source ended')
      this.timeline.close = Date.now()

      if (this.status !== 'aborted' && this.status !== 'reset') {
        this.status = 'closed'
      }

      if (this.onEnd != null) {
        this.onEnd(this.endErr)
      }

      this.closed.resolve()
    } else {
      this.log.trace('sink ended, waiting for source to end')
    }
  }

  // Close for both Reading and Writing
  async close (options?: AbortOptions): Promise<void> {
    if (this.status !== 'open') {
      return
    }

    this.log.trace('closing gracefully')

    this.status = 'closing'

    // wait for read and write ends to close
    await raceSignal(Promise.all([
      this.closeWrite(options),
      this.closeRead(options),
      this.closed.promise
    ]), options?.signal)

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

    if (this.status !== 'reset' && this.status !== 'aborted' && this.timeline.closeRead == null) {
      this.log.trace('send close read to remote')
      await this.sendCloseRead(options)
    }

    if (readStatus === 'ready') {
      this.log.trace('ending internal source queue with %d queued bytes', this.streamSource.readableLength)
      this.streamSource.end()
    }

    this.log.trace('closed readable end of stream')
  }

  async closeWrite (options: AbortOptions = {}): Promise<void> {
    if (this.writeStatus === 'closing' || this.writeStatus === 'closed') {
      return
    }

    this.log.trace('closing writable end of stream with starting write status "%s"', this.writeStatus)

    if (this.writeStatus === 'ready') {
      this.log.trace('sink was never sunk, sink an empty array')

      await raceSignal(this.sink([]), options.signal)
    }

    if (this.writeStatus === 'writing') {
      // try to let sending outgoing data succeed
      if (this.sendingData != null) {
        await raceSignal(this.sendingData.promise, options.signal)
      }

      // stop reading from the source passed to `.sink`
      this.log.trace('aborting source passed to .sink')
      this.sinkController.abort()
      await raceSignal(this.sinkEnd.promise, options.signal)
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

    const err = new StreamResetError('stream reset')

    this.status = 'reset'
    this.timeline.reset = Date.now()
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

    this.log.trace('stream destroyed')

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
