import type { Connection } from '../connection/index.js'
import type { PeerId } from '../peer-id/index.js'

export interface Topology {
  /**
   * If true, invoke `onConnect` for this topology on transient (e.g. short-lived
   * and/or data-limited) connections. (default: false)
   */
  notifyOnTransient?: boolean

  /**
   * Invoked when a new connection is opened to a peer that supports the
   * registered protocol
   */
  onConnect?(peerId: PeerId, conn: Connection): void

  /**
   * Invoked when the last connection to a peer that supports the registered
   * protocol closes
   */
  onDisconnect?(peerId: PeerId): void
}
