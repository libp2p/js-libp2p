import type { Connection } from '../connection/index.js'
import type { PeerId } from '../peer-id/index.js'

/**
 * A topology filter
 *
 * @see https://libp2p.github.io/js-libp2p/functions/_libp2p_peer_collections.peerFilter-1.html
 */
export interface TopologyFilter {
  has (peerId: PeerId): boolean
  add (peerId: PeerId): void
  remove (peerId: PeerId): void
}

/**
 * A topology is a network overlay that contains a subset of peers in the
 * complete network.
 *
 * It is a way to be notified when peers that support a given protocol connect
 * to or disconnect from the current node.
 */
export interface Topology {
  /**
   * An optional filter can prevent duplicate topology notifications for the
   * same peer.
   */
  filter?: TopologyFilter

  /**
   * If true, invoke `onConnect` for this topology on limited connections, e.g.
   * ones with limits on how much data can be transferred or how long they can
   * be open for.
   *
   * @default false
   */
  notifyOnLimitedConnection?: boolean

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
