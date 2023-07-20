import { Yamux } from './muxer.js'
import type { YamuxMuxerInit } from './muxer.js'
import type { StreamMuxerFactory } from '@libp2p/interface/stream-muxer'
export { GoAwayCode } from './frame.js'

export function yamux (init: YamuxMuxerInit = {}): () => StreamMuxerFactory {
  return () => new Yamux(init)
}
