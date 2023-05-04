import type { KadDHT } from '@libp2p/kad-dht'
import { kadDHT } from '@libp2p/kad-dht'
import type { Libp2pOptions } from '../../src/index.js'
import { createBaseOptions } from '../utils/base-options.js'

export function createRoutingOptions (...overrides: Libp2pOptions[]): Libp2pOptions<{ dht: KadDHT }> {
  return createBaseOptions({
    services: {
      dht: kadDHT()
    }
  }, ...overrides)
}
