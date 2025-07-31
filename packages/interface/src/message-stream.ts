import type { Logger, StreamCloseEvent, StreamHalfCloseEvent, StreamMessageEvent, TypedEventTarget } from './index.js'
import type { AbortOptions } from '@multiformats/multiaddr'
import type { Uint8ArrayList } from 'uint8arraylist'

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
export type MessageStreamWriteStatus = 'writable' | 'paused' | 'closing' | 'closed'

/**
 * An object that records the times of various events
 */
export interface MessageStreamTimeline {
  /**
   * A timestamp of when the message stream was opened
   */
  open: number

  /**
   * A timestamp of when the message stream was closed for both reading and writing
   */
  close?: number

  /**
   * A timestamp of when the message stream was reset
   */
  reset?: number

  /**
   * A timestamp of when the message stream was aborted
   */
  abort?: number

  /**
   * A timestamp of when the stream was closed for reading
   */
  closeRead?: number

  /**
   * A timestamp of when the stream was closed for writing
   */
  closeWrite?: number

  /**
   * A timestamp of when the remote stream was closed for reading
   */
  remoteCloseRead?: number

  /**
   * A timestamp of when the remote stream was closed for writing
   */
  remoteCloseWrite?: number
}

export interface MessageStreamEvents {
  /**
   * Data was received from the remote end of the message stream
   */
  message: StreamMessageEvent

  /**
   * The local send buffer can now accept new data
   */
  drain: Event

  /**
   * The message stream closed.
   *
   * The `local` property of the `StreamCloseEvent` can be used to detect
   * whether the close event was initiated locally or remotely, and the `error`
   * property can be used to tell if the stream closed gracefully or not.
   *
   * No further events will be emitted and the stream cannot be used to send or
   * receive any more data.
   */
  close: StreamCloseEvent

  /**
   * The readable end of the stream closed gracefully
   */
  closeRead: StreamHalfCloseEvent

  /**
   * The writable end of the stream closed gracefully
   */
  closeWrite: StreamHalfCloseEvent

  /**
   * The remote closed it's readable end of the stream
   */
  remoteClosedRead: StreamHalfCloseEvent

  /**
   * The remote closed it's writable end of the stream
   */
  remoteClosedWrite: StreamHalfCloseEvent
}

export interface MessageStream<Events extends MessageStreamEvents = MessageStreamEvents> extends TypedEventTarget<Events> {
  /**
   * Timestamps of when stream events occurred
   */
  timeline: MessageStreamTimeline

  /**
   * A logging implementation that can be used to log stream-specific messages
   */
  log: Logger

  /**
   * The current status of the message stream
   */
  status: MessageStreamStatus

  /**
   * The current status of the readable end of the stream
   */
  readStatus: MessageStreamReadStatus

  /**
   * The current status of the writable end of the stream
   */
  writeStatus: MessageStreamWriteStatus

  /**
   * The current status of the readable end of the stream
   */
  remoteReadStatus: MessageStreamReadStatus

  /**
   * The current status of the writable end of the stream
   */
  remoteWriteStatus: MessageStreamWriteStatus

  /**
   * The maximum number of bytes to store when paused. If receipt of more bytes
   * from the remote end of the stream causes the buffer size to exceed this
   * value the stream will be reset and an 'error' event emitted.
   */
  maxPauseBufferLength: number

  /**
   * If no data is transmitted over the stream in this many ms, the stream will
   * be aborted with an InactivityTimeoutError
   */
  inactivityTimeout: number

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
   * Immediately close the stream for reading and writing, discard any
   * unsent/unread data, and emit a StreamAbortEvent event.
   */
  abort (err: Error): void

  /**
   * Gracefully close the stream.
   *
   * A StreamCloseEvent will be emitted on the channel once all outstanding data
   * has been sent to the remote or a StreamAbortEvent event if sending the data
   * fails.
   *
   * This is a no-op if the stream is already closed.
   */
  close (options?: AbortOptions): Promise<void>

  /**
   * Sends a message to the remote informing them we will not read any more data
   * from the stream.
   *
   * If the writable end of the stream is already closed, a 'close' event will
   * be emitted on the stream.
   */
  closeRead (options?: AbortOptions): Promise<void>

  /**
   * Gracefully close the stream for writing - any outstanding data will be sent
   * to the remote and any further calls to `.send` will throw.
   *
   * If the readable end of the stream is already closed, a 'close' event will
   * be emitted on the stream once any buffered data has been sent.
   */
  closeWrite (options?: AbortOptions): Promise<void>

  /**
   * Stop emitting further 'message' events. Any received data will be stored in
   * an internal buffer. If the buffer size reaches `maxPauseBufferLength`, the
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
}
