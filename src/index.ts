import { PROTOCOL_ID } from './constants.js'
import type { Duplex } from 'it-stream-types'
import type { AbortOptions } from '@libp2p/interfaces'

export { PROTOCOL_ID }

export interface ProtocolStream<TSource, TSink = TSource> {
  stream: Duplex<TSource, TSink>
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

export { select } from './select.js'
export { handle } from './handle.js'
