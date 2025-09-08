import type { AbortOptions } from './index.ts'
import type { MessageStream, MessageStreamReadStatus, MessageStreamWriteStatus } from './message-stream.js'

/**
 * A Stream is a lightweight data channel between two peers that can be written
 * to and read from at both ends.
 *
 * It is half-closable - that is in order for it to be closed fully and any
 * associated memory reclaimed, both ends must close their writeable end of the
 * stream.
 *
 * It's also possible to close the readable end of the stream, but this depends
 * on the underlying stream muxer supporting this operation which not all do.
 */
export interface Stream extends MessageStream {
  /**
   * Unique identifier for a stream. Identifiers are not unique across muxers.
   */
  id: string

  /**
   * The protocol negotiated for this stream
   */
  protocol: string

  /**
   * The status of the readable end of the stream
   */
  readStatus: MessageStreamReadStatus

  /**
   * The status of the writable end of the stream
   */
  writeStatus: MessageStreamWriteStatus

  /**
   * The status of the readable end of the remote end of the stream - n.b. this
   * requires the underlying stream transport to support sending STOP_SENDING
   * messages or similar.
   */
  remoteReadStatus: MessageStreamReadStatus

  /**
   * The status of the writable end of the remote end of the stream
   */
  remoteWriteStatus: MessageStreamWriteStatus

  /**
   * Close stream for writing and return a promise that resolves once any
   * pending data has been passed to the underlying transport.
   *
   * Note that the stream itself will remain readable until the remote end also
   * closes it's writable end.
   *
   * To close without waiting for the remote, call `.abort` instead. If you want
   * to wait for data to be sent first, ensure if the `.writableStatus` property
   * is not 'paused', if it is, wait for a `drain` event before aborting.
   */
  close (options?: AbortOptions): Promise<void>

  /**
   * Send a message to the remote end of the stream informing them that any
   * incoming data will be discarded so they should stop sending.
   *
   * This requires the underlying resource to support this operation - for
   * example the QUIC, WebTransport, WebRTC transports do but anything
   * multiplexed using Yamux or Mplex do not.
   */
  closeRead(options?: AbortOptions): Promise<void>
}
