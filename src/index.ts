import { PROTOCOL_ID } from './constants.js'
import type { Duplex, Source } from 'it-stream-types'
import type { AbortOptions } from '@libp2p/interfaces'

export { PROTOCOL_ID }

export interface ProtocolStream<TSource, TSink = TSource, RSink = Promise<void>> {
  stream: Duplex<AsyncGenerator<TSource>, Source<TSink>, RSink>
  protocol: string
}

export interface ByteArrayInit extends AbortOptions {
  writeBytes: true
}

export interface ByteListInit extends AbortOptions {
  writeBytes?: false
}

export interface MultistreamSelectInit extends AbortOptions {
  writeBytes?: boolean
}

export { select, lazySelect } from './select.js'
export { handle } from './handle.js'
