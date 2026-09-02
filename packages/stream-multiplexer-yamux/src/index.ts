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
 *
 * @example Using the low-level API
 *
 * ```typescript
 * import { yamux } from '@libp2p/yamux'
 * import { multiaddrConnectionPair } from '@libp2p/utils'
 *
 * // a pair of connected multiaddr connections - in a real application these
 * // would be the two ends of a network connection
 * const [outboundConnection, inboundConnection] = multiaddrConnectionPair()
 *
 * const clientMuxer = yamux()().createStreamMuxer(outboundConnection)
 * const serverMuxer = yamux()().createStreamMuxer(inboundConnection)
 *
 * // echo incoming data back on the server side
 * serverMuxer.addEventListener('stream', (evt) => {
 *   const stream = evt.detail
 *
 *   stream.addEventListener('message', (msg) => {
 *     stream.send(msg.data)
 *   })
 * })
 *
 * // open a stream from the client and send some data
 * const stream = await clientMuxer.createStream()
 *
 * const received = new Promise<string>((resolve) => {
 *   stream.addEventListener('message', (msg) => {
 *     resolve(new TextDecoder().decode(msg.data.subarray()))
 *   })
 * })
 *
 * stream.send(new TextEncoder().encode('hello world'))
 *
 * console.info(await received)
 * // -> hello world
 *
 * await stream.close()
 * await clientMuxer.close()
 * await serverMuxer.close()
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
