import type { Connection, MultiaddrConnection } from '@libp2p/interface/connection'
import type { StreamMuxerFactory } from '@libp2p/interface/stream-muxer'

export interface UpgraderOptions {
  skipEncryption?: boolean
  skipProtection?: boolean
  muxerFactory?: StreamMuxerFactory
}

export interface Upgrader {
  /**
   * Upgrades an outbound connection on `transport.dial`.
   */
  upgradeOutbound: (maConn: MultiaddrConnection, opts?: UpgraderOptions) => Promise<Connection>

  /**
   * Upgrades an inbound connection on transport listener.
   */
  upgradeInbound: (maConn: MultiaddrConnection, opts?: UpgraderOptions) => Promise<Connection>
}
