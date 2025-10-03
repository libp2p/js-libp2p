import type { Logger, StreamCloseEvent, StreamMessageEvent, TypedEventTarget, AbortOptions } from './index.js'
import type { Uint8ArrayList } from 'uint8arraylist'

/**
 * The direction of the message stream
 */
export type MessageStreamDirection = 'inbound' | 'outbound'

/**
 * The states a message stream can be in
 */
export type MessageStreamStatus = 'open' | 'closing' | 'closed' | 'aborted' | 'reset'

/**
 * The states the readable end of a message stream can be in
 */
export type MessageStreamReadStatus = 'readable' | 'paused' | 'closing' | 'closed'

/**
 * The states the writable end of a message stream can be in
 */
export type MessageStreamWriteStatus = 'writable' | 'closing' | 'closed'

/**
 * An object that records the times of various events
 */
export interface MessageStreamTimeline {
  /**
   * A timestamp of when the message stream was opened
   */
  open: number

  /**
   * A timestamp of when the message stream was closed for both reading and
   * writing by both ends of the stream
   */
  close?: number
}

export interface MessageStreamEvents {
  /**
   * Data was received from the remote end of the message stream
   */
  message: StreamMessageEvent

  /**
   * The local send buffer has emptied and the stream may be written to once
   * more, unless it is currently closing.
   */
  drain: Event

  /**
   * The underlying resource is closed - no further events will be emitted and
   * the stream cannot be used to send or receive any more data.
   *
   * When the `.error` field is set, the `local` property of the event will be
   * `true` value if the `.abort` was invoked, otherwise it means a remote error
   * occurred and the peer sent a reset signal.
   */
  close: StreamCloseEvent

  /**
   * Where the stream implementation supports half-closing, it may emit this
   * event when the remote end of the stream closes it's writable end.
   *
   * After this event is received no further 'message' events will be emitted
   * though the stream can still be written to, if it has not been closed at
   * this end.
   */
  remoteCloseWrite: Event

  /**
   * The outgoing write queue emptied - there are no more bytes queued for
   * sending to the remote end of the stream.
   */
  idle: Event
}

export interface MessageStream<Timeline extends MessageStreamTimeline = MessageStreamTimeline> extends TypedEventTarget<MessageStreamEvents>, AsyncIterable<Uint8Array | Uint8ArrayList> {
  /**
   * The current status of the message stream
   */
  status: MessageStreamStatus

  /**
   * Timestamps of when stream events occurred
   */
  timeline: Timeline

  /**
   * A logging implementation that can be used to log stream-specific messages
   */
  log: Logger

  /**
   * Whether this stream is inbound or outbound
   */
  direction: MessageStreamDirection

  /**
   * The maximum number of bytes to store when paused. If receipt of more bytes
   * from the remote end of the stream causes the buffer size to exceed this
   * value the stream will be reset and a 'close' event emitted.
   *
   * This value can be changed at runtime.
   */
  maxReadBufferLength: number

  /**
   * When the `.send` method returns false it means that the underlying resource
   * has signalled that it's write buffer is full. If the user continues to call
   * `.send`, outgoing bytes are stored in an internal buffer until the
   * underlying resource signals that it can accept more data.
   *
   * If the size of that internal buffer exceed this value the stream will be
   * reset and a 'close' event emitted.
   *
   * This value can be changed at runtime.
   */
  maxWriteBufferLength?: number

  /**
   * If no data is transmitted over the stream in this many ms, the stream will
   * be aborted with an InactivityTimeoutError
   */
  inactivityTimeout: number

  /**
   * If this property is `true`, the underlying transport has signalled that its
   * write buffer is full and that `.send` should not be called again.
   *
   * A `drain` event will be emitted after which is its safe to call `.send`
   * again to resume sending.
   */
  writableNeedsDrain: boolean

  /**
   * Returns the number of bytes that are queued to be read
   */
  readBufferLength: number

  /**
   * Returns the number of bytes that are queued to be written
   */
  writeBufferLength: number

  /**
   * Write data to the stream. If the method returns false it means the
   * internal buffer is now full and the caller should wait for the 'drain'
   * event before sending more data.
   *
   * This method may throw if:
   * - The internal send buffer is full
   * - The stream has previously been closed for writing locally or remotely
   */
  send (data: Uint8Array | Uint8ArrayList): boolean

  /**
   * Stop accepting new data to send and return a promise that resolves when any
   * unsent data has been written into the underlying resource.
   */
  close (options?: AbortOptions): Promise<void>

  /**
   * Stop accepting new data to send, discard any unsent/unread data, and emit a
   * 'close' event with the 'error' property set to the passed error.
   */
  abort (err: Error): void

  /**
   * Stop emitting further 'message' events. Any received data will be stored in
   * an internal buffer. If the buffer size reaches `maxReadBufferLength`, the
   * stream will be reset and a StreamAbortEvent emitted.
   *
   * If the underlying resource supports it, the remote peer will be instructed
   * to pause transmission of further data.
   */
  pause (): void

  /**
   * Resume emitting 'message' events.
   *
   * If the underlying resource supports it, the remote peer will be informed
   * that it is ok to start sending data again.
   */
  resume (): void

  /**
   * Queue the passed data to be emitted as a 'message' event either during the
   * next tick or sooner if data is received from the underlying resource.
   */
  push (buf: Uint8Array | Uint8ArrayList): void

  /**
   * Similar to the `.push` method, except this ensures the passed data is
   * emitted before any other queued data.
   */
  unshift (data: Uint8Array | Uint8ArrayList): void

  /**
   * Returns a promise that resolves when the stream can accept new data or
   * rejects if the stream is closed or reset before this occurs.
   */
  onDrain (options?: AbortOptions): Promise<void>
}
