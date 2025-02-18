import type { PeerId } from './peer-id.js'
import type { Multiaddr } from '@multiformats/multiaddr'

/**
 * A `PeerInfo` is a lightweight object that represents a remote peer, it can be
 * obtained from peer discovery mechanisms, HTTP RPC endpoints, etc.
 *
 * @see https://docs.libp2p.io/concepts/fundamentals/peers/#peer-info
 */
export interface PeerInfo {
  /**
   * The identifier of the remote peer
   */
  id: PeerId

  /**
   * The multiaddrs a peer is listening on
   */
  multiaddrs: Multiaddr[]
}
