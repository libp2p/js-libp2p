import type { ConnectionGater } from '@libp2p/interface'

/**
 * Returns a default connection gater implementation that allows everything
 */
export function connectionGater (gater: ConnectionGater = {}): ConnectionGater {
  return gater
}
