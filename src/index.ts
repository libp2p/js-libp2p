import { Components, Initializable } from '@libp2p/components'
import type { StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface-stream-muxer'
import { MplexStreamMuxer } from './mplex.js'

export interface MplexInit {
  /**
   * The maximum size of message that can be sent in one go in bytes.
   * Messages larger than this will be split into multiple smaller
   * messages (default: 1MB)
   */
  maxMsgSize?: number

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

export class Mplex implements StreamMuxerFactory, Initializable {
  public protocol = '/mplex/6.7.0'
  private readonly _init: MplexInit
  private components: Components = new Components()

  constructor (init: MplexInit = {}) {
    this._init = init
  }

  init (components: Components): void {
    this.components = components
  }

  createStreamMuxer (init: StreamMuxerInit = {}): StreamMuxer {
    return new MplexStreamMuxer(this.components, {
      ...init,
      ...this._init
    })
  }
}
