
import { WebSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { Mplex } from '@libp2p/mplex'
import { Plaintext } from '../../src/insecure/index.js'
import type { Libp2pOptions } from '../../src'
import mergeOptions from 'merge-options'

export function createBaseOptions (overrides?: Libp2pOptions): Libp2pOptions {
  const options: Libp2pOptions = {
    transports: [
      new WebSockets({
        filter: filters.all
      })
    ],
    streamMuxers: [
      new Mplex()
    ],
    connectionEncryption: [
      new Plaintext()
    ],
    relay: {
      enabled: false,
      hop: {
        enabled: false
      }
    }
  }

  return mergeOptions(options, overrides)
}
