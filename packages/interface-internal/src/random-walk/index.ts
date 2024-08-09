import type { AbortOptions, PeerInfo } from '@libp2p/interface'

/**
 * RandomWalk finds random peers on the network and dials them. Use this after
 * registering a Topology if you need to discover common network services.
 */
export interface RandomWalk {
  /**
   * Begin or join an existing walk. Abort the passed signal if you wish to
   * abort the walk early.
   */
  walk(options?: AbortOptions): AsyncGenerator<PeerInfo>
}
