import type { Components } from '@libp2p/interfaces/components'
import type { StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interfaces/stream-muxer'
import { MplexStreamMuxer } from './mplex.js'

export interface MplexInit extends StreamMuxerInit {
  maxMsgSize?: number
}

export class Mplex implements StreamMuxerFactory {
  public protocol = '/mplex/6.7.0'

  createStreamMuxer (components: Components, init?: MplexInit) {
    return new MplexStreamMuxer(components, init)
  }
}
