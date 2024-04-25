import type { PeerInfo } from '@libp2p/interface'

/**
 * RandomWalk finds random peers on the network and dials them. Use this after
 * registering a Topology if you need to discover common network services.
 */
export interface RandomWalk {
  /**
   * Begin or join an existing walk
   */
  walk(): AsyncGenerator<PeerInfo>
}
