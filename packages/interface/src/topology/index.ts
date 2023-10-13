import type { Connection } from '../connection/index.js'
import type { PeerId } from '../peer-id/index.js'

export interface Topology {
  onConnect?(peerId: PeerId, conn: Connection): void
  onDisconnect?(peerId: PeerId): void
}
