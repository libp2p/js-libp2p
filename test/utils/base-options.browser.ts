
import { WebSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { Yamux } from '@chainsafe/libp2p-yamux'
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
      new Yamux(),
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
    },
    nat: {
      enabled: false
    }
  }

  return mergeOptions(options, overrides)
}
