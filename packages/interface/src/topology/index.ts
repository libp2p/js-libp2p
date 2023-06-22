import type { Connection } from '../connection/index.js'
import type { PeerId } from '../peer-id/index.js'

export interface Topology {
  min?: number
  max?: number

  onConnect?: (peerId: PeerId, conn: Connection) => void
  onDisconnect?: (peerId: PeerId) => void
}
