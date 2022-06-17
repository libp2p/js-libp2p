import { Components, Initializable } from '@libp2p/components'
import type { StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface-stream-muxer'
import { MplexStreamMuxer } from './mplex.js'

export interface MplexInit {
  /**
   * The maximum size of message that can be sent in one go in bytes.
   * Messages larger than this will be split into multiple smaller
   * messages.
   */
  maxMsgSize?: number

  /**
   * The maximum number of multiplexed streams that can be open at any
   * one time. An attempt to open more than this will throw.
   */
  maxInboundStreams?: number

  /**
   * The maximum number of multiplexed streams that can be open at any
   * one time. An attempt to open more than this will throw.
   */
  maxOutboundStreams?: number

  /**
   * Incoming stream messages are buffered until processed by the stream
   * handler. If the buffer reaches this size in bytes the stream will
   * be reset.
   */
  maxStreamBufferSize?: number
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
