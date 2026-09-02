/**
 * @packageDocumentation
 *
 * This module is a JavaScript implementation of [Yamux from Hashicorp](https://github.com/hashicorp/yamux/blob/master/spec.md) designed to be used with [js-libp2p](https://github.com/libp2p/js-libp2p).
 *
 * Formerly published as [`@chainsafe/libp2p-yamux`](https://www.npmjs.com/package/@chainsafe/libp2p-yamux).
 *
 * @example Configure libp2p with Yamux
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { yamux } from '@libp2p/yamux'
 *
 * const node = await createLibp2p({
 *   // ... other options
 *   streamMuxers: [
 *     yamux()
 *   ]
 * })
 * ```
 */

import { Yamux } from './muxer.ts'
import type { YamuxMuxer, YamuxMuxerInit } from './muxer.ts'
import type { StreamMuxerFactory } from '@libp2p/interface'

export { GoAwayCode } from './frame.ts'
export type { FrameHeader, FrameType } from './frame.ts'
export type { YamuxMuxerInit }

export function yamux (init: YamuxMuxerInit = {}): () => StreamMuxerFactory<YamuxMuxer> {
  return () => new Yamux(init)
}
