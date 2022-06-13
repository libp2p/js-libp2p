import type { Components } from '@libp2p/interfaces/components'
import type { StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interfaces/stream-muxer'
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
  maxStreamsPerConnection?: number

  /**
   * Incoming stream messages are buffered until processed by the stream
   * handler. If the buffer reaches this size in bytes the stream will
   * be reset.
   */
  maxStreamBufferSize?: number
}

export class Mplex implements StreamMuxerFactory {
  public protocol = '/mplex/6.7.0'
  private readonly init: MplexInit

  constructor (init: MplexInit = {}) {
    this.init = init
  }

  createStreamMuxer (components: Components, init: StreamMuxerInit = {}) {
    return new MplexStreamMuxer(components, {
      ...init,
      ...this.init
    })
  }
}
