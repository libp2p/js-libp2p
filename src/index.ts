import type { StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface-stream-muxer'
import { MplexStreamMuxer } from './mplex.js'

export interface MplexInit {
  /**
   * The maximum size of message that can be sent in one go in bytes.
   * Messages larger than this will be split into multiple smaller
   * messages. If we receive a message larger than this an error will
   * be thrown and the connection closed. (default: 1MB)
   */
  maxMsgSize?: number

  /**
   * Constrains the size of the unprocessed message queue buffer.
   * Before messages are deserialized, the raw bytes are buffered to ensure
   * we have the complete message to deserialized. If the queue gets longer
   * than this value an error will be thrown and the connection closed.
   * (default: 4MB)
   */
  maxUnprocessedMessageQueueSize?: number

  /**
   * Each byte array written into a multiplexed stream is converted to one or
   * more messages which are sent as byte arrays to the remote node. Sending
   * lots of small messages can be expensive - use this setting to batch up
   * the serialized bytes of all messages sent during the current tick up to
   * this limit to send in one go similar to Nagle's algorithm. N.b. you
   * should benchmark your application carefully when using this setting as it
   * may cause the opposite of the desired effect. Omit this setting to send
   * all messages as they become available. (default: undefined)
   */
  minSendBytes?: number

  /**
   * The maximum number of multiplexed streams that can be open at any
   * one time. A request to open more than this will have a stream
   * reset message sent immediately as a response for the newly opened
   * stream id (default: 1024)
   */
  maxInboundStreams?: number

  /**
   * The maximum number of multiplexed streams that can be open at any
   * one time. An attempt to open more than this will throw (default: 1024)
   */
  maxOutboundStreams?: number

  /**
   * Incoming stream messages are buffered until processed by the stream
   * handler. If the buffer reaches this size in bytes the stream will
   * be reset (default: 4MB)
   */
  maxStreamBufferSize?: number

  /**
   * When `maxInboundStreams` is hit, if the remote continues try to open
   * more than this many new multiplexed streams per second the connection
   * will be closed (default: 5)
   */
  disconnectThreshold?: number
}

class Mplex implements StreamMuxerFactory {
  public protocol = '/mplex/6.7.0'
  private readonly _init: MplexInit

  constructor (init: MplexInit = {}) {
    this._init = init
  }

  createStreamMuxer (init: StreamMuxerInit = {}): StreamMuxer {
    return new MplexStreamMuxer({
      ...init,
      ...this._init
    })
  }
}

export function mplex (init: MplexInit = {}): () => StreamMuxerFactory {
  return () => new Mplex(init)
}
