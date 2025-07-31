import { StreamResetError, StreamStateError, TypedEventEmitter, StreamMessageEvent, StreamBufferError, StreamResetEvent, StreamAbortEvent, StreamLocalCloseEvent, StreamRemoteCloseEvent } from '@libp2p/interface'
import { raceEvent } from 'race-event'
import { Uint8ArrayList } from 'uint8arraylist'
import type { MessageStreamEvents, MessageStreamStatus, MessageStream, AbortOptions, MessageStreamTimeline, MessageStreamReadStatus, MessageStreamWriteStatus } from '@libp2p/interface'
import type { Logger } from '@libp2p/logger'

const DEFAULT_MAX_PAUSE_BUFFER_LENGTH = Math.pow(2, 20) * 4 // 4MB

export interface MessageStreamInit {
  /**
   * A Logger implementation used to log stream-specific information
   */
  log: Logger

  /**
   * If no data is sent or received in this number of ms the stream will be
   * reset and an 'error' event emitted.
   *
   * @default 120_000
   */
  inactivityTimeout?: number

  /**
   * The maximum number of bytes to store when paused. If receipt of more bytes
   * from the remote end of the stream causes the buffer size to exceed this
   * value the stream will be reset and an 'error' event emitted.
   */
  maxPauseBufferLength?: number
}

export abstract class AbstractMessageStream<Events extends MessageStreamEvents = MessageStreamEvents> extends TypedEventEmitter<Events> implements MessageStream<Events> {
  public readonly timeline: MessageStreamTimeline
  public status: MessageStreamStatus
  public readStatus: MessageStreamReadStatus
  public writeStatus: MessageStreamWriteStatus
  public remoteReadStatus: MessageStreamReadStatus
  public remoteWriteStatus: MessageStreamWriteStatus
  public inactivityTimeout: number
  public maxPauseBufferLength: number
  public readonly log: Logger

  protected readonly pauseBuffer: Uint8ArrayList
  protected readonly sendQueue: Uint8ArrayList

  constructor (init: MessageStreamInit) {
    super()

    this.log = init.log
    this.status = 'open'
    this.readStatus = 'readable'
    this.remoteReadStatus = 'readable'
    this.writeStatus = 'writable'
    this.remoteWriteStatus = 'writable'
    this.inactivityTimeout = init.inactivityTimeout ?? 120_000
    this.maxPauseBufferLength = init.maxPauseBufferLength ?? DEFAULT_MAX_PAUSE_BUFFER_LENGTH
    this.pauseBuffer = new Uint8ArrayList()
    this.sendQueue = new Uint8ArrayList()
    this.timeline = {
      open: Date.now()
    }

    this.processSendQueue = this.processSendQueue.bind(this)

    this.addEventListener('drain', () => {
      this.log('begin sending again, write status was %s, send queue size', this.writeStatus, this.sendQueue.byteLength)

      if (this.writeStatus === 'paused') {
        this.writeStatus = 'writable'
      }

      this.processSendQueue()
    })
  }

  send (data: Uint8Array | Uint8ArrayList): boolean {
    if (this.status !== 'open') {
      throw new StreamStateError(`Stream status was "${this.status}" and not "open"`)
    }

    if (this.writeStatus === 'closing' || this.writeStatus === 'closed') {
      throw new StreamStateError(`Stream writable status was "${this.writeStatus}" and not "writable"`)
    }

    this.sendQueue.append(data)
    return this.processSendQueue()
  }

  private processSendQueue (): boolean {
    // don't send data if the underlying send buffer is full
    if (this.writeStatus === 'paused') {
      return false
    }

    // don't send data if the remote has asked us to pause
    if (this.remoteReadStatus !== 'readable') {
      return false
    }

    if (this.sendQueue.byteLength === 0) {
      return true
    }

    const toSend = this.sendQueue.sublist()
    this.sendQueue.consume(this.sendQueue.byteLength)

    const sendMore = this.sendData(toSend)

    if (sendMore === false) {
      this.log('pausing sending because underlying stream is full')
      this.writeStatus = 'paused'
    }

    return sendMore
  }

  pause (): void {
    this.log.trace('pausing readable end')

    if (this.readStatus !== 'readable') {
      return
    }

    this.readStatus = 'paused'
    this.sendPause()
  }

  resume (): void {
    this.log.trace('resuming readable end')

    if (this.readStatus !== 'paused') {
      return
    }

    this.readStatus = 'readable'

    // emit any data that accumulated while we were paused
    if (this.pauseBuffer.byteLength > 0) {
      const data = new Uint8ArrayList(this.pauseBuffer)
      this.pauseBuffer.consume(this.pauseBuffer.byteLength)
      this.dispatchEvent(new StreamMessageEvent(data))
    }

    this.sendResume()

    if (this.remoteReadStatus === 'closed') {
      this.readStatus = 'closing'
      this.onReadClosed()
    }
  }

  /**
   * Receive a reset message - close immediately for reading and writing (remote
   * error)
   */
  onRemoteReset (): void {
    this.log.trace('on remote reset')

    if (this.status === 'closed' || this.status === 'aborted' || this.status === 'reset') {
      return
    }

    this.status = 'reset'
    this.readStatus = 'closed'
    this.writeStatus = 'closed'
    this.remoteReadStatus = 'closed'
    this.remoteWriteStatus = 'closed'

    this.timeline.reset = Date.now()
    this.timeline.closeRead = Date.now()
    this.timeline.closeWrite = Date.now()
    this.timeline.remoteCloseRead = Date.now()
    this.timeline.remoteCloseWrite = Date.now()

    const err = new StreamResetError()

    this.dispatchEvent(new StreamResetEvent(err))
  }

  /**
   * The remote closed for writing so we should expect to receive no more
   * messages
   */
  onRemoteClose (): void {
    this.log.trace('on remote close')

    if (this.status === 'closing' || this.status === 'closed') {
      this.log('received remote close but local source is already closed')
      return
    }

    this.log('remote closed')
    this.status = 'closed'
    this.timeline.close = Date.now()

    this.dispatchEvent(new StreamRemoteCloseEvent())
  }

  /**
   * When an extending class reads data from it's implementation-specific source,
   * call this method to allow the stream consumer to read the data.
   */
  onData (data: Uint8Array | Uint8ArrayList): void {
    this.log.trace('on data')

    if (this.readStatus === 'readable') {
      this.dispatchEvent(new StreamMessageEvent(data))
    } else if (this.readStatus === 'paused') {
      // queue the message
      this.pauseBuffer.append(data)

      // abort if the pause buffer is too large
      if (this.pauseBuffer.byteLength > this.maxPauseBufferLength) {
        this.abort(new StreamBufferError(`Pause buffer length of ${this.pauseBuffer.byteLength} exceeded limit of ${this.maxPauseBufferLength}`))
      }
    } else {
      this.abort(new StreamStateError(`Stream readable was "${this.readStatus}" and not "reaable" or "paused"`))
    }
  }

  /**
   * Close immediately for reading and writing and send a reset message (local
   * error)
   */
  abort (err: Error): void {
    if (this.status === 'closed' || this.status === 'aborted' || this.status === 'reset') {
      return
    }

    this.log.error('abort with error - %e', err)

    try {
      this.sendReset(err)
    } catch (err: any) {
      this.log('failed to send reset to remote - %e', err)
    }

    this.status = 'aborted'
    this.readStatus = 'closed'
    this.writeStatus = 'closed'
    this.remoteReadStatus = 'closed'
    this.remoteWriteStatus = 'closed'

    this.timeline.abort = Date.now()
    this.timeline.closeRead = Date.now()
    this.timeline.closeWrite = Date.now()
    this.timeline.remoteCloseRead = Date.now()
    this.timeline.remoteCloseWrite = Date.now()

    queueMicrotask(() => {
      this.dispatchEvent(new StreamAbortEvent(err))
    })
  }

  async close (options?: AbortOptions): Promise<void> {
    if (this.status !== 'open') {
      return
    }

    this.log.trace('closing gracefully')
    this.status = 'closing'

    await Promise.all([
      this.closeRead(options),
      this.closeWrite(options)
    ])

    if (this.status !== 'closing') {
      return
    }

    this.log('closed gracefully')
    this.status = 'closed'
    this.timeline.close = Date.now()

    queueMicrotask(() => {
      this.dispatchEvent(new StreamLocalCloseEvent())
    })
  }

  async closeRead (options?: AbortOptions): Promise<void> {
    if (this.readStatus === 'closing' || this.readStatus === 'closed') {
      return
    }

    this.log.trace('closing readable end of stream with starting read status "%s"', this.readStatus)

    this.readStatus = 'closing'

    if (this.remoteWriteStatus !== 'closing' && this.remoteWriteStatus !== 'closed') {
      await this.sendCloseRead(options)
    }

    this.onReadClosed()
  }

  /**
   * Called by extending classes when the remote closed its readable end
   */
  onRemoteClosedRead (): void {
    this.log.trace('remote close read')

    this.remoteReadStatus = 'closed'
    this.timeline.remoteCloseRead = Date.now()

    switch (this.writeStatus) {
      case 'closing':
      case 'closed':
        this.log('received remote close read but local writable is already closed')
        return
      case 'paused':
      case 'writable':
        if (this.sendQueue.byteLength > 0) {
          this.log('remote closed readable end, dropping %d unsent bytes', this.sendQueue.byteLength)
          this.sendQueue.consume(this.sendQueue.byteLength)
        }

        this.writeStatus = 'closing'
        this.timeline.remoteCloseRead = Date.now()
        this.onWriteClosed()
        break
      default:
        this.log.error('unknown write status %s', this.writeStatus)
    }

    this.safeDispatchEvent('remoteClosedRead')
  }

  /**
   * Called by extending classes after sendCloseRead has been called and any
   * queued messages have been sent to the remote
   */
  private onReadClosed (): void {
    if (this.readStatus !== 'closing') {
      return
    }

    this.readStatus = 'closed'
    this.timeline.closeRead = Date.now()

    this.log.trace('read closed, write status "%s"', this.writeStatus)

    queueMicrotask(() => {
      this.safeDispatchEvent('closeRead')
    })

    if (this.writeStatus === 'closed') {
      this.onClosed()
    }
  }

  async closeWrite (options?: AbortOptions): Promise<void> {
    if (this.writeStatus === 'closing' || this.writeStatus === 'closed') {
      return
    }

    if (this.writeStatus === 'paused') {
      this.log.trace('waiting for drain before closing writable end of stream, %d unsent bytes', this.sendQueue.byteLength)
      await raceEvent(this, 'drain', options?.signal)
    }

    this.log.trace('closing writable end of stream with starting write status "%s"', this.writeStatus)

    this.writeStatus = 'closing'

    if (this.remoteReadStatus !== 'closing' && this.remoteReadStatus !== 'closed') {
      await this.sendCloseWrite(options)
    }

    this.onWriteClosed()
  }

  /**
   * Called by extending classes when the remote closed its writable end
   */
  onRemoteClosedWrite (): void {
    this.log.trace('remote close write')

    this.remoteWriteStatus = 'closed'
    this.timeline.remoteCloseWrite = Date.now()

    switch (this.readStatus) {
      case 'closing':
      case 'closed':
        this.log('received remote close write but local read status is closing or closed')
        return
      case 'paused':
        // if our readable is paused, `this.onReadClosed()` will be invoked
        // after 'this.resume' has been called
        this.log('received remote close write but local read status is paused')
        return
      case 'readable':
        this.readStatus = 'closing'
        this.onReadClosed()
        break
      default:
        this.log.error('unknown read status %s', this.readStatus)
    }

    this.safeDispatchEvent('remoteClosedWrite')
  }

  private onWriteClosed (): void {
    if (this.writeStatus !== 'closing') {
      return
    }

    this.writeStatus = 'closed'
    this.timeline.closeWrite = Date.now()

    this.log.trace('write closed, read status "%s"', this.readStatus)

    queueMicrotask(() => {
      this.safeDispatchEvent('closeWrite')
    })

    if (this.readStatus === 'closed') {
      this.onClosed()
    }
  }

  private onClosed (): void {
    if (this.status === 'closed') {
      return
    }

    this.log('closed gracefully')
    this.status = 'closed'
    this.timeline.close = Date.now()

    queueMicrotask(() => {
      this.safeDispatchEvent('close')
    })
  }

  /**
   * Called when the remote end of the stream would like us to stop sending
   * data messages.
   */
  onRemotePaused (): void {
    this.log.trace('on remote pause readable')
    this.remoteReadStatus = 'paused'
  }

  /**
   * Called when the remote end of the stream would like us to resume sending
   * data messages.
   */
  onRemoteResumed (): void {
    this.log.trace('on remote resume readable')
    this.remoteReadStatus = 'readable'
  }

  /**
   * Send a data message to the remote end of the stream
   */
  abstract sendData (data: Uint8Array | Uint8ArrayList): boolean

  /**
   * Send a reset message to the remote end of the stream
   */
  abstract sendReset (err: Error): void

  /**
   * If supported, instruct the remote end of the stream to temporarily stop
   * sending data messages
   */
  abstract sendPause (): void

  /**
   * If supported, inform the remote end of the stream they may resume sending
   * data messages
   */
  abstract sendResume (): void

  /**
   * Send a message to the remote end of the stream, gracefully informing them
   * that we will send no more data messages.
   *
   * Invoke the callback after the message has been sent.
   */
  abstract sendCloseWrite (options?: AbortOptions): Promise<void>

  /**
   * Send a message to the remote end of the stream, gracefully informing them
   * that we will read no more data messages.
   *
   * Invoke the callback after the message has been sent.
   */
  abstract sendCloseRead (options?: AbortOptions): Promise<void>
}
