import { StreamResetError, StreamStateError, TypedEventEmitter, StreamMessageEvent, StreamBufferError, StreamResetEvent, StreamAbortEvent, StreamCloseEvent } from '@libp2p/interface'
import { pushable } from 'it-pushable'
import { raceEvent } from 'race-event'
import { Uint8ArrayList } from 'uint8arraylist'
import type { MessageStreamEvents, MessageStreamStatus, MessageStream, AbortOptions, MessageStreamTimeline, MessageStreamReadStatus, MessageStreamWriteStatus, MessageStreamDirection } from '@libp2p/interface'
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

  /**
   * The stream direction
   */
  direction?: MessageStreamDirection
}

export interface SendResult {
  /**
   * The number of bytes from the passed buffer that were sent
   */
  sentBytes: number

  /**
   * If the underlying resource can accept more data immediately. If `true`,
   * `sent` must equal the `.byteLength` of the buffer passed to `sendData`.
   */
  canSendMore: boolean
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
  public direction: MessageStreamDirection

  protected readonly pauseBuffer: Uint8ArrayList
  protected readonly sendQueue: Uint8ArrayList

  constructor (init: MessageStreamInit) {
    super()

    this.log = init.log
    this.direction = init.direction ?? 'outbound'
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

  async * [Symbol.asyncIterator] (): AsyncGenerator<Uint8Array | Uint8ArrayList> {
    const output = pushable<Uint8Array | Uint8ArrayList>()

    const onMessage = (evt: StreamMessageEvent): void => {
      output.push(evt.data)
    }
    this.addEventListener('message', onMessage)

    const onClose = (evt: StreamCloseEvent): void => {
      output.end(evt.error)
    }
    this.addEventListener('close', onClose)

    const onRemoteCloseWrite = (): void => {
      output.end()
    }
    this.addEventListener('remoteCloseWrite', onRemoteCloseWrite)

    try {
      yield * output
    } finally {
      this.removeEventListener('message', onMessage)
      this.removeEventListener('close', onClose)
      this.removeEventListener('remoteCloseWrite', onRemoteCloseWrite)
    }
  }

  send (data: Uint8Array | Uint8ArrayList): boolean {
    if (this.writeStatus !== 'writable' && this.writeStatus !== 'paused') {
      // return true to make this a no-op otherwise callers might wait for a
      // "drain" event that will never come
      return true
    }

    this.sendQueue.append(data)
    return this.processSendQueue()
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
    this.writeStatus = 'closed'
    this.remoteWriteStatus = 'closed'
    this.readStatus = 'closed'
    this.remoteReadStatus = 'closed'

    this.timeline.abort = Date.now()
    this.timeline.closeWrite = Date.now()
    this.timeline.remoteCloseWrite = Date.now()
    this.timeline.closeRead = Date.now()
    this.timeline.remoteCloseRead = Date.now()

    if (this.pauseBuffer.byteLength > 0) {
      this.pauseBuffer.consume(this.pauseBuffer.byteLength)
    }

    if (this.sendQueue.byteLength > 0) {
      this.sendQueue.consume(this.sendQueue.byteLength)
    }

    this.dispatchEvent(new StreamAbortEvent(err))
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

    this.log.trace('closed gracefully')

    this.onClosed()
  }

  async closeWrite (options?: AbortOptions): Promise<void> {
    if (this.writeStatus === 'closing' || this.writeStatus === 'closed') {
      return
    }

    const startingWriteStatus = this.writeStatus

    this.writeStatus = 'closing'

    if (startingWriteStatus === 'paused') {
      this.log.trace('waiting for drain before closing writable end of stream, %d unsent bytes', this.sendQueue.byteLength)
      await raceEvent(this, 'drain', options?.signal)
    }

    await this.sendCloseWrite(options)

    this.writeStatus = 'closed'
    this.timeline.closeWrite = Date.now()

    this.log('closed writable end gracefully')

    setTimeout(() => {
      this.safeDispatchEvent('closeWrite')

      if (this.remoteWriteStatus === 'closed') {
        this.onClosed()
      }
    }, 0)
  }

  async closeRead (options?: AbortOptions): Promise<void> {
    if (this.readStatus === 'closing' || this.readStatus === 'closed') {
      return
    }

    this.readStatus = 'closing'

    await this.sendCloseRead(options)

    this.readStatus = 'closed'
    this.timeline.closeRead = Date.now()

    this.log('closed readable end gracefully')

    setTimeout(() => {
      this.safeDispatchEvent('closeRead')
    }, 0)
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

    if (this.writeStatus === 'closing' || this.writeStatus === 'closed' ||
        this.remoteReadStatus === 'closing' || this.remoteReadStatus === 'closed'
    ) {
      return
    }

    this.sendResume()
  }

  push (data: Uint8Array | Uint8ArrayList): void {
    if (data.byteLength === 0) {
      return
    }

    this.pauseBuffer.append(data)

    setTimeout(() => {
      this.dispatchPauseBuffer()
    }, 0)
  }

  /**
   * When an extending class reads data from it's implementation-specific source,
   * call this method to allow the stream consumer to read the data.
   */
  onData (data: Uint8Array | Uint8ArrayList): void {
    // discard the data if our readable end is closed
    if (this.readStatus === 'closing' || this.readStatus === 'closed') {
      return
    }

    // check the pause buffer in case data has been pushed onto the stream
    this.dispatchPauseBuffer()

    if (data.byteLength === 0) {
      return
    }

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
   * Receive a reset message - close immediately for reading and writing (remote
   * error)
   */
  onRemoteReset (): void {
    this.log.trace('on remote reset')

    if (this.status === 'closed' || this.status === 'aborted' || this.status === 'reset') {
      return
    }

    this.status = 'reset'
    this.writeStatus = 'closed'
    this.remoteWriteStatus = 'closed'
    this.remoteReadStatus = 'closed'

    this.timeline.reset = Date.now()
    this.timeline.closeWrite = Date.now()
    this.timeline.remoteCloseWrite = Date.now()
    this.timeline.remoteCloseRead = Date.now()

    if (this.pauseBuffer.byteLength === 0) {
      this.readStatus = 'closed'
      this.timeline.closeRead = Date.now()
    }

    const err = new StreamResetError()

    this.dispatchEvent(new StreamResetEvent(err))
  }

  /**
   * Called by extending classes when the remote closed its writable end
   */
  onRemoteCloseWrite (): void {
    if (this.remoteWriteStatus === 'closed') {
      return
    }

    this.log.trace('on remote close write - this.writeStatus %s', this.writeStatus)

    this.remoteWriteStatus = 'closed'
    this.timeline.remoteCloseWrite = Date.now()

    this.safeDispatchEvent('remoteCloseWrite')

    this.maybeCloseRead()

    if (this.writeStatus === 'closed') {
      this.onClosed()
    }
  }

  /**
   * Called by extending classes when the remote closed its readable end
   */
  onRemoteCloseRead (): void {
    this.log.trace('on remote close read - this.writeStatus %s', this.writeStatus)

    this.remoteReadStatus = 'closed'
    this.timeline.remoteCloseRead = Date.now()

    this.safeDispatchEvent('remoteCloseRead')

    if (this.writeStatus === 'closed') {
      this.onClosed()
    }
  }

  /**
   * This can be called by extending classes when an underlying transport
   * closed. No further messages will be sent or received.
   */
  onClosed (): void {
    if (this.status !== 'open') {
      return
    }

    this.status = 'closed'
    this.timeline.close = Date.now()

    this.maybeCloseRead()

    setTimeout(() => {
      this.dispatchEvent(new StreamCloseEvent())
    }, 0)
  }

  private maybeCloseRead (): void {
    if (this.readStatus === 'readable' && this.pauseBuffer.byteLength === 0) {
      this.readStatus = 'closed'
      this.timeline.closeRead = Date.now()

      setTimeout(() => {
        this.safeDispatchEvent('closeRead')
      }, 0)
    }
  }

  private processSendQueue (): boolean {
    // don't send data if the underlying send buffer is full
    if (this.writeStatus === 'paused') {
      this.log('pause sending because local write status was "paused"')
      return false
    }

    if (this.sendQueue.byteLength === 0) {
      this.log('not sending because send queue was empty')
      return true
    }

    const toSend = this.sendQueue.sublist()
    const totalBytes = toSend.byteLength
    const { sentBytes, canSendMore } = this.sendData(toSend)
    this.sendQueue.consume(sentBytes)

    if (!canSendMore) {
      this.log('pausing sending because underlying stream is full')
      this.writeStatus = 'paused'
      return canSendMore
    }

    if (sentBytes !== totalBytes) {
      this.abort(new Error(`All bytes from current chunk must be sent before continuing - sent ${sentBytes}/${totalBytes}`))
    }

    return canSendMore
  }

  private dispatchPauseBuffer (): void {
    if (this.pauseBuffer.byteLength === 0) {
      return
    }

    // discard the pause buffer if our readable end is closed
    if (this.readStatus === 'closing' || this.readStatus === 'closed') {
      this.pauseBuffer.consume(this.pauseBuffer.byteLength)
    } else if (this.readStatus === 'readable') {
      const buf = this.pauseBuffer.sublist()
      this.pauseBuffer.consume(buf.byteLength)

      this.dispatchEvent(new StreamMessageEvent(buf))
    }
  }

  /**
   * Send a data message to the remote end of the stream. Implementations of
   * this method should return the number of bytes from the passed buffer that
   * were sent successfully and if the underlying resource can accept more data.
   *
   * The implementation should always attempt to send the maximum amount of data
   * possible.
   *
   * Returning a result that means the data was only partially sent but that the
   * underlying resource can accept more data is invalid.
   */
  abstract sendData (data: Uint8ArrayList): SendResult

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
   * Send a message to the remote end of the stream, informing them that we will
   * send no more data messages.
   */
  abstract sendCloseWrite (options?: AbortOptions): Promise<void>

  /**
   * If supported, send a message to the remote end of the stream, informing
   * them that we will read no more data messages.
   */
  abstract sendCloseRead (options?: AbortOptions): Promise<void>
}
