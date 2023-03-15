import { tcp } from '@libp2p/tcp'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '../../src/insecure/index.js'
import type { Libp2pOptions } from '../../src'
import mergeOptions from 'merge-options'

export function createBaseOptions (...overrides: Libp2pOptions[]): Libp2pOptions {
  const options: Libp2pOptions = {
    transports: [
      tcp()
    ],
    streamMuxers: [
      mplex()
    ],
    connectionEncryption: [
      plaintext()
    ],
    nat: {
      enabled: false
    }
  }

  return mergeOptions(options, ...overrides)
}
