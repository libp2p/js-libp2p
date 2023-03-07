import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '../../src/insecure/index.js'
import type { Libp2pOptions } from '../../src'
import mergeOptions from 'merge-options'
import { yamux } from '@chainsafe/libp2p-yamux'

export function createBaseOptions (...overrides: Libp2pOptions[]): Libp2pOptions {
  const options: Libp2pOptions = {
    transports: [
      tcp()
    ],
    streamMuxers: [
      yamux(),
      mplex()
    ],
    connectionEncryption: [
      plaintext()
    ],
    relay: {
      enabled: true,
      hop: {
        enabled: false
      }
    },
    nat: {
      enabled: false
    }
  }

  return mergeOptions(options, ...overrides)
}
