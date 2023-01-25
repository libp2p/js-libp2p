import type { Libp2pOptions } from '../../src/index.js'
import { createBaseOptions } from '../utils/base-options.js'

const listenAddr = '/ip4/0.0.0.0/tcp/0'

export function createNodeOptions (...overrides: Libp2pOptions[]): Libp2pOptions {
  return createBaseOptions({
    addresses: {
      listen: [listenAddr]
    },
    connectionManager: {
      autoDial: false
    },
    relay: {
      hop: {
        enabled: false
      },
      service: {
        enabled: true,
        maxReservations: 1
      }
    }
  }, ...overrides)
}

export function createRelayOptions (...overrides: Libp2pOptions[]): Libp2pOptions {
  return createNodeOptions({
    relay: {
      hop: {
        enabled: true
      }
    }
  }, ...overrides)
}
