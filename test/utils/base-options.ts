import { TCP } from '@libp2p/tcp'
import { Mplex } from '@libp2p/mplex'
import { Plaintext } from '../../src/insecure/index.js'
import type { Libp2pOptions } from '../../src'
import mergeOptions from 'merge-options'

export function createBaseOptions (...overrides: Libp2pOptions[]): Libp2pOptions {
  const options: Libp2pOptions = {
    transports: [
      new TCP()
    ],
    streamMuxers: [
      new Mplex()
    ],
    connectionEncryption: [
      new Plaintext()
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
