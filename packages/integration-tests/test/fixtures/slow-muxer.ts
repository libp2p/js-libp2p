/* eslint-env mocha */

import { yamux } from '@chainsafe/libp2p-yamux'
import delay from 'delay'
import map from 'it-map'
import type { StreamMuxerFactory } from '@libp2p/interface'

/**
 * Creates a muxer with a delay between each sent packet
 */
export function slowMuxer (packetDelay: number): ((components: any) => StreamMuxerFactory) {
  return (components) => {
    const muxerFactory = yamux()(components)
    const originalCreateStreamMuxer = muxerFactory.createStreamMuxer.bind(muxerFactory)

    muxerFactory.createStreamMuxer = (init) => {
      const muxer = originalCreateStreamMuxer(init)
      muxer.source = map(muxer.source, async (buf) => {
        await delay(packetDelay)
        return buf
      })

      return muxer
    }

    return muxerFactory
  }
}
