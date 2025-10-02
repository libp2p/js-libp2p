import { StreamResetError, TypedEventEmitter, StreamMessageEvent, StreamBufferError, StreamResetEvent, StreamAbortEvent, StreamCloseEvent, StreamStateError } from '@libp2p/interface'
import { pushable } from 'it-pushable'
import { raceSignal } from 'race-signal'
import { Uint8ArrayList } from 'uint8arraylist'
import { StreamClosedError } from './errors.ts'
import type { MessageStreamEvents, MessageStreamStatus, MessageStream, AbortOptions, MessageStreamTimeline, MessageStreamDirection, EventHandler, StreamOptions, MessageStreamReadStatus, MessageStreamWriteStatus } from '@libp2p/interface'
import type { Logger } from '@libp2p/logger'

const DEFAULT_MAX_READ_BUFFER_LENGTH = Math.pow(2, 20) * 4 // 4MB

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
  public maxWriteBufferLength?: number
  public readonly log: Logger
  public direction: MessageStreamDirection
  public maxMessageSize?: number

  public readStatus: MessageStreamReadStatus
  public writeStatus: MessageStreamWriteStatus
  public remoteReadStatus: MessageStreamReadStatus
  public remoteWriteStatus: MessageStreamWriteStatus

  public writableNeedsDrain: boolean

  /**
   * Any data stored here is emitted before any new incoming data.
   *
   * This is used when the stream is paused or if data is pushed onto the stream
   */
  protected readonly readBuffer: Uint8ArrayList
  protected readonly writeBuffer: Uint8ArrayList
  protected sendingData: boolean

  private onDrainPromise?: PromiseWithResolvers<void>

  constructor (init: MessageStreamInit) {
    super()

    this.status = 'open'
    this.log = init.log
    this.direction = init.direction ?? 'outbound'
    this.inactivityTimeout = init.inactivityTimeout ?? 120_000
    this.maxReadBufferLength = init.maxReadBufferLength ?? DEFAULT_MAX_READ_BUFFER_LENGTH
    this.maxWriteBufferLength = init.maxWriteBufferLength
    this.maxMessageSize = init.maxMessageSize
    this.readBuffer = new Uint8ArrayList()
    this.writeBuffer = new Uint8ArrayList()

    this.readStatus = 'readable'
    this.remoteReadStatus = 'readable'
    this.writeStatus = 'writable'
    this.remoteWriteStatus = 'writable'
    this.sendingData = false
    this.writableNeedsDrain = false

    // @ts-expect-error type could have required fields other than 'open'
    this.timeline = {
      open: Date.now()
    }

    this.processSendQueue = this.processSendQueue.bind(this)

    const continueSendingOnDrain = (): void => {
      if (this.writableNeedsDrain) {
        this.log.trace('drain event received, continue sending data')
        this.writableNeedsDrain = false
        this.processSendQueue()
      }

      this.onDrainPromise?.resolve()
    }
    this.addEventListener('drain', continueSendingOnDrain)

    const rejectOnDrainOnClose = (evt: StreamCloseEvent): void => {
      this.onDrainPromise?.reject(evt.error ?? new StreamClosedError())
    }
    this.addEventListener('close', rejectOnDrainOnClose)
  }

  get readBufferLength (): number {
    return this.readBuffer.byteLength
  }

  get writeBufferLength (): number {
    return this.writeBuffer.byteLength
  }

  async onDrain (options?: AbortOptions): Promise<void> {
    if (this.writableNeedsDrain !== true) {
      return Promise.resolve()
    }

    if (this.onDrainPromise == null) {
      this.onDrainPromise = Promise.withResolvers()
    }

    return raceSignal(this.onDrainPromise.promise, options?.signal)
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

    this.log.trace('append %d bytes to write buffer', data.byteLength)
    this.writeBuffer.append(data)

    return this.processSendQueue()
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

  unshift (data: Uint8Array | Uint8ArrayList): void {
    if (this.readStatus === 'closed' || this.readStatus === 'closing') {
      throw new StreamStateError(`Cannot push data onto a stream that is ${this.readStatus}`)
    }

    if (data.byteLength === 0) {
      return
    }

    this.readBuffer.prepend(data)

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
      this.log('close readable end after transport closed and read buffer is empty')
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
    // bail if the underlying transport is full
    if (this.writableNeedsDrain) {
      this.log.trace('not processing send queue as drain is required')
      this.checkWriteBufferLength()

      return false
    }

    // bail if there is no data to send
    if (this.writeBuffer.byteLength === 0) {
      this.log.trace('not processing send queue as no bytes to send')
      return true
    }

    // bail if we are already sending data
    if (this.sendingData) {
      this.log.trace('not processing send queue as already sending data')
      return true
    }

    this.sendingData = true

    this.log.trace('processing send queue with %d queued bytes', this.writeBuffer.byteLength)

    try {
      let canSendMore = true
      const totalBytes = this.writeBuffer.byteLength
      let sentBytes = 0

      // send as much data as possible while we have data to send and the
      // underlying muxer can still accept data
      while (this.writeBuffer.byteLength > 0) {
        const end = Math.min(this.maxMessageSize ?? this.writeBuffer.byteLength, this.writeBuffer.byteLength)

        // this can happen if a subclass changes the max message size dynamically
        if (end === 0) {
          canSendMore = false
          break
        }

        // chunk to send to the remote end
        const toSend = this.writeBuffer.sublist(0, end)

        // copy toSend in case the extending class modifies the list
        const willSend = new Uint8ArrayList(toSend)

        this.writeBuffer.consume(toSend.byteLength)

        // sending data can cause buffers to fill up, events to be emitted and
        // this method to be invoked again
        const sendResult = this.sendData(toSend)
        canSendMore = sendResult.canSendMore
        sentBytes += sendResult.sentBytes

        if (sendResult.sentBytes !== willSend.byteLength) {
          willSend.consume(sendResult.sentBytes)
          this.writeBuffer.prepend(willSend)
        }

        if (!canSendMore) {
          break
        }
      }

      if (!canSendMore) {
        this.log.trace('sent %d/%d bytes, pausing sending because underlying stream is full, %d bytes left in the write buffer', sentBytes, totalBytes, this.writeBuffer.byteLength)
        this.writableNeedsDrain = true
        this.checkWriteBufferLength()
      }

      // we processed all bytes in the queue, resolve the write queue idle promise
      if (this.writeBuffer.byteLength === 0) {
        this.safeDispatchEvent('idle')
      }

      return canSendMore
    } finally {
      this.sendingData = false
    }
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
      if (this.readBuffer.byteLength === 0 && this.remoteWriteStatus === 'closed') {
        this.log('close readable end after dispatching read buffer and remote writable end is closed')
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
    if (this.maxWriteBufferLength == null) {
      return
    }

    if (this.writeBuffer.byteLength > this.maxWriteBufferLength) {
      this.abort(new StreamBufferError(`Write buffer length of ${this.writeBuffer.byteLength} exceeded limit of ${this.maxWriteBufferLength}, write status is ${this.writeStatus}`))
    }
  }

  public onMuxerNeedsDrain (): void {
    this.writableNeedsDrain = true
  }

  public onMuxerDrain (): void {
    this.safeDispatchEvent('drain')
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
