/* eslint-env mocha */

import { mplex } from '@libp2p/mplex'
import delay from 'delay'
import map from 'it-map'
import type { Components } from '../../src/components.js'
import type { StreamMuxerFactory } from '@libp2p/interface'

/**
 * Creates a muxer with a delay between each sent packet
 */
export function slowMuxer (packetDelay: number): ((components: Components) => StreamMuxerFactory) {
  return (components) => {
    const muxerFactory = mplex()(components)
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
