import { StreamResetError, TypedEventEmitter, StreamMessageEvent, StreamBufferError, StreamResetEvent, StreamAbortEvent, StreamCloseEvent, StreamStateError } from '@libp2p/interface'
import { pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import type { MessageStreamEvents, MessageStreamStatus, MessageStream, AbortOptions, MessageStreamTimeline, MessageStreamDirection, EventHandler, StreamOptions, MessageStreamReadStatus, MessageStreamWriteStatus } from '@libp2p/interface'
import type { Logger } from '@libp2p/logger'

const DEFAULT_MAX_READ_BUFFER_LENGTH = Math.pow(2, 20) * 4 // 4MB
const DEFAULT_MAX_WRITE_BUFFER_LENGTH = Math.pow(2, 20) * 4 // 4MB

export interface MessageStreamInit extends StreamOptions {
  /**
   * A Logger implementation used to log stream-specific information
   */
  log: Logger

  /**
   * The stream direction
   */
  direction?: MessageStreamDirection

  /**
   * By default all available bytes are passed to the `sendData` method of
   * extending classes, if smaller chunks are required, pass a value here.
   */
  maxMessageSize?: number
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

export abstract class AbstractMessageStream<Timeline extends MessageStreamTimeline = MessageStreamTimeline> extends TypedEventEmitter<MessageStreamEvents> implements MessageStream {
  public status: MessageStreamStatus
  public readonly timeline: Timeline
  public inactivityTimeout: number
  public maxReadBufferLength: number
  public maxWriteBufferLength: number
  public readonly log: Logger
  public direction: MessageStreamDirection
  public maxMessageSize?: number

  public readStatus: MessageStreamReadStatus
  public writeStatus: MessageStreamWriteStatus
  public remoteReadStatus: MessageStreamReadStatus
  public remoteWriteStatus: MessageStreamWriteStatus

  /**
   * Any data stored here is emitted before any new incoming data.
   *
   * This is used when the stream is paused or if data is pushed onto the stream
   */
  protected readonly readBuffer: Uint8ArrayList
  protected readonly writeBuffer: Uint8ArrayList

  constructor (init: MessageStreamInit) {
    super()

    this.status = 'open'
    this.log = init.log
    this.direction = init.direction ?? 'outbound'
    this.inactivityTimeout = init.inactivityTimeout ?? 120_000
    this.maxReadBufferLength = init.maxReadBufferLength ?? DEFAULT_MAX_READ_BUFFER_LENGTH
    this.maxWriteBufferLength = init.maxWriteBufferLength ?? DEFAULT_MAX_WRITE_BUFFER_LENGTH
    this.maxMessageSize = init.maxMessageSize
    this.readBuffer = new Uint8ArrayList()
    this.writeBuffer = new Uint8ArrayList()

    this.readStatus = 'readable'
    this.remoteReadStatus = 'readable'
    this.writeStatus = 'writable'
    this.remoteWriteStatus = 'writable'

    // @ts-expect-error type could have required fields other than 'open'
    this.timeline = {
      open: Date.now()
    }

    this.processSendQueue = this.processSendQueue.bind(this)

    this.addEventListener('drain', () => {
      if (this.writeStatus === 'paused') {
        this.writeStatus = 'writable'
      }

      this.processSendQueue()
    })
  }

  async * [Symbol.asyncIterator] (): AsyncGenerator<Uint8Array | Uint8ArrayList> {
    if (this.readStatus !== 'readable' && this.readStatus !== 'paused') {
      return
    }

    const output = pushable<Uint8Array | Uint8ArrayList>()

    const streamAsyncIterableOnMessageListener = (evt: StreamMessageEvent): void => {
      output.push(evt.data)
    }
    this.addEventListener('message', streamAsyncIterableOnMessageListener)

    const streamAsyncIterableOnCloseListener = (evt: StreamCloseEvent): void => {
      output.end(evt.error)
    }
    this.addEventListener('close', streamAsyncIterableOnCloseListener)

    const streamAsyncIterableOnRemoteCloseWriteListener = (): void => {
      output.end()
    }
    this.addEventListener('remoteCloseWrite', streamAsyncIterableOnRemoteCloseWriteListener)

    try {
      yield * output
    } finally {
      this.removeEventListener('message', streamAsyncIterableOnMessageListener)
      this.removeEventListener('close', streamAsyncIterableOnCloseListener)
      this.removeEventListener('remoteCloseWrite', streamAsyncIterableOnRemoteCloseWriteListener)
    }
  }

  isReadable (): boolean {
    return this.status === 'open'
  }

  send (data: Uint8Array | Uint8ArrayList): boolean {
    if (this.writeStatus === 'closed' || this.writeStatus === 'closing') {
      throw new StreamStateError(`Cannot write to a stream that is ${this.writeStatus}`)
    }

    if (this.writeStatus !== 'writable' && this.writeStatus !== 'paused') {
      // return true to make this a no-op otherwise callers might wait for a
      // "drain" event that will never come
      return true
    }

    this.writeBuffer.append(data)

    if (this.writeStatus === 'writable') {
      return this.processSendQueue()
    }

    // accept the data but tell the caller to not send any more
    return false
  }

  /**
   * Close immediately for reading and writing and send a reset message (local
   * error)
   */
  abort (err: Error): void {
    if (this.status === 'aborted' || this.status === 'reset' || this.status === 'closed') {
      return
    }

    this.log.error('abort with error - %e', err)

    this.status = 'aborted'

    // throw away unread data
    if (this.readBuffer.byteLength > 0) {
      this.readBuffer.consume(this.readBuffer.byteLength)
    }

    // throw away unsent data
    if (this.writeBuffer.byteLength > 0) {
      this.writeBuffer.consume(this.writeBuffer.byteLength)
      this.safeDispatchEvent('idle')
    }

    this.writeStatus = 'closed'
    this.remoteWriteStatus = 'closed'

    this.readStatus = 'closed'
    this.remoteReadStatus = 'closed'
    this.timeline.close = Date.now()

    try {
      this.sendReset(err)
    } catch (err: any) {
      this.log('failed to send reset to remote - %e', err)
    }

    this.dispatchEvent(new StreamAbortEvent(err))
  }

  pause (): void {
    if (this.readStatus === 'closed' || this.readStatus === 'closing') {
      throw new StreamStateError('Cannot pause a stream that is closing/closed')
    }

    if (this.readStatus === 'paused') {
      return
    }

    this.readStatus = 'paused'
    this.sendPause()
  }

  resume (): void {
    if (this.readStatus === 'closed' || this.readStatus === 'closing') {
      throw new StreamStateError('Cannot resume a stream that is closing/closed')
    }

    if (this.readStatus === 'readable') {
      return
    }

    this.readStatus = 'readable'
    // emit any data that accumulated while we were paused
    this.dispatchReadBuffer()
    this.sendResume()
  }

  push (data: Uint8Array | Uint8ArrayList): void {
    if (this.readStatus === 'closed' || this.readStatus === 'closing') {
      throw new StreamStateError(`Cannot push data onto a stream that is ${this.readStatus}`)
    }

    if (data.byteLength === 0) {
      return
    }

    this.readBuffer.append(data)

    if (this.readStatus === 'paused' || this.listenerCount('message') === 0) {
      // abort if the read buffer is too large
      this.checkReadBufferLength()

      return
    }

    // TODO: use a microtask instead?
    setTimeout(() => {
      this.dispatchReadBuffer()
    }, 0)
  }

  /**
   * When an extending class reads data from it's implementation-specific source,
   * call this method to allow the stream consumer to read the data.
   */
  onData (data: Uint8Array | Uint8ArrayList): void {
    if (data.byteLength === 0) {
      // this.log('ignoring empty data')
      return
    }

    // discard the data if our readable end is closed
    if (this.readStatus === 'closing' || this.readStatus === 'closed') {
      this.log('ignoring data - read status %s', this.readStatus)
      return
    }

    this.readBuffer.append(data)
    this.dispatchReadBuffer()
  }

  addEventListener<K extends keyof MessageStreamEvents>(type: K, listener: EventHandler<MessageStreamEvents[K]> | null, options?: boolean | AddEventListenerOptions): void
  addEventListener (type: string, listener: EventHandler<Event>, options?: boolean | AddEventListenerOptions): void
  addEventListener (...args: any[]): void {
    // @ts-expect-error cannot ensure args has enough members
    super.addEventListener.apply(this, args)

    // if a 'message' listener is being added and we have queued data, dispatch
    // the data
    if (args[0] === 'message' && this.readBuffer.byteLength > 0) {
      // event listeners can be added in constructors and often use object
      // properties - if this the case we can access a class member before it
      // has been initialized so dispatch the message in the microtask queue
      queueMicrotask(() => {
        this.dispatchReadBuffer()
      })
    }
  }

  /**
   * Receive a reset message - close immediately for reading and writing (remote
   * error)
   */
  onRemoteReset (): void {
    this.log('remote reset')

    this.status = 'reset'
    this.writeStatus = 'closed'
    this.remoteWriteStatus = 'closed'
    this.remoteReadStatus = 'closed'
    this.timeline.close = Date.now()

    if (this.readBuffer.byteLength === 0) {
      this.readStatus = 'closed'
    }

    const err = new StreamResetError()
    this.dispatchEvent(new StreamResetEvent(err))
  }

  /**
   * The underlying resource or transport this stream uses has closed - it is
   * not possible to send any more messages though any data still in the read
   * buffer may still be read
   */
  onTransportClosed (err?: Error): void {
    this.log('transport closed')

    if (this.readStatus === 'readable' && this.readBuffer.byteLength === 0) {
      this.readStatus = 'closed'
    }

    if (this.remoteReadStatus !== 'closed') {
      this.remoteReadStatus = 'closed'
    }

    if (this.remoteWriteStatus !== 'closed') {
      this.remoteWriteStatus = 'closed'
    }

    if (this.writeStatus !== 'closed') {
      this.writeStatus = 'closed'
    }

    if (err != null) {
      this.abort(err)
    } else {
      if (this.status === 'open' || this.status === 'closing') {
        this.timeline.close = Date.now()
        this.status = 'closed'
        this.writeStatus = 'closed'
        this.remoteWriteStatus = 'closed'
        this.remoteReadStatus = 'closed'
        this.dispatchEvent(new StreamCloseEvent())
      }
    }
  }

  /**
   * Called by extending classes when the remote closes its writable end
   */
  onRemoteCloseWrite (): void {
    if (this.remoteWriteStatus === 'closed') {
      return
    }

    this.log.trace('on remote close write')

    this.remoteWriteStatus = 'closed'

    this.safeDispatchEvent('remoteCloseWrite')

    if (this.writeStatus === 'closed') {
      this.onTransportClosed()
    }
  }

  /**
   * Called by extending classes when the remote closes its readable end
   */
  onRemoteCloseRead (): void {
    this.log.trace('on remote close read')

    this.remoteReadStatus = 'closed'

    // throw away any unsent bytes if the remote closes it's readable end
    if (this.writeBuffer.byteLength > 0) {
      this.writeBuffer.consume(this.writeBuffer.byteLength)
      this.safeDispatchEvent('idle')
    }
  }

  protected processSendQueue (): boolean {
    if (this.writeBuffer.byteLength === 0) {
      return true
    }

    if (this.writeStatus === 'paused') {
      this.checkWriteBufferLength()

      return false
    }

    let canSendMore = true

    while (this.writeBuffer.byteLength > 0) {
      const toSend = this.writeBuffer.sublist(0, Math.min(this.maxMessageSize ?? this.writeBuffer.byteLength, this.writeBuffer.byteLength))
      const sendResult = this.sendData(toSend)
      canSendMore = sendResult.canSendMore

      this.writeBuffer.consume(sendResult.sentBytes)

      if (!canSendMore) {
        this.log.trace('pausing sending because underlying stream is full')
        this.writeStatus = 'paused'
        this.checkWriteBufferLength()
        break
      }
    }

    // we processed all bytes in the queue, resolve the write queue idle promise
    if (this.writeBuffer.byteLength === 0) {
      this.log.trace('write queue became idle')
      this.safeDispatchEvent('idle')
    }

    return canSendMore
  }

  protected dispatchReadBuffer (): void {
    try {
      if (this.listenerCount('message') === 0) {
        this.log.trace('not dispatching pause buffer as there are no listeners for the message event')
        return
      }

      if (this.readBuffer.byteLength === 0) {
        this.log.trace('not dispatching pause buffer as there is no data to dispatch')
        return
      }

      if (this.readStatus === 'paused') {
        this.log.trace('not dispatching pause buffer we are paused')
        return
      }

      // discard the pause buffer if our readable end is closed
      if (this.readStatus === 'closing' || this.readStatus === 'closed') {
        this.log('dropping %d bytes because the readable end is %s', this.readBuffer.byteLength, this.readStatus)
        this.readBuffer.consume(this.readBuffer.byteLength)
        return
      }

      const buf = this.readBuffer.sublist()
      this.readBuffer.consume(buf.byteLength)

      this.dispatchEvent(new StreamMessageEvent(buf))
    } finally {
      if (this.remoteWriteStatus === 'closed') {
        this.readStatus = 'closed'
      }

      // abort if we failed to consume the read buffer and it is too large
      this.checkReadBufferLength()
    }
  }

  private checkReadBufferLength (): void {
    if (this.readBuffer.byteLength > this.maxReadBufferLength) {
      this.abort(new StreamBufferError(`Read buffer length of ${this.readBuffer.byteLength} exceeded limit of ${this.maxReadBufferLength}, read status is ${this.readStatus}`))
    }
  }

  private checkWriteBufferLength (): void {
    if (this.writeBuffer.byteLength > this.maxWriteBufferLength) {
      this.abort(new StreamBufferError(`Write buffer length of ${this.writeBuffer.byteLength} exceeded limit of ${this.maxWriteBufferLength}, write status is ${this.writeStatus}`))
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
   * Stop accepting new data to send and return a promise that resolves when any
   * unsent data has been written into the underlying resource.
   */
  abstract close (options?: AbortOptions): Promise<void>
}
